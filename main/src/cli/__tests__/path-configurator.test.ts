import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { vol } from 'memfs'
import path from 'node:path'
import {
  configureShellPath,
  removeShellPath,
  checkPathConfiguration,
} from '../path-configurator'

// Mock dependencies
vi.mock('node:fs')

// Must use hoisted for mocks that need to reference this
const { mockExecAsync } = vi.hoisted(() => ({
  mockExecAsync: vi.fn(),
}))

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>()
  return {
    ...actual,
    exec: vi.fn(),
    default: {
      ...actual,
      exec: vi.fn(),
    },
  }
})

vi.mock('node:util', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:util')>()
  return {
    ...actual,
    promisify: () => mockExecAsync,
    default: {
      ...actual,
      promisify: () => mockExecAsync,
    },
  }
})

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>()
  return {
    ...actual,
    homedir: () => '/home/testuser',
    default: {
      ...actual,
      homedir: () => '/home/testuser',
    },
  }
})

vi.mock('../constants', () => ({
  getShellRcFiles: () => ({
    bash: ['/home/testuser/.bashrc', '/home/testuser/.bash_profile'],
    zsh: ['/home/testuser/.zshrc'],
    fish: ['/home/testuser/.config/fish/config.fish'],
  }),
  SHELL_PATH_ENTRY: 'export PATH="$HOME/.toolhive/bin:$PATH"',
  SHELL_PATH_MARKERS: {
    start: '# Added by ToolHive UI - do not modify this block',
    end: '# End ToolHive UI',
  },
  FISH_PATH_ENTRY: 'fish_add_path -g $HOME/.toolhive/bin',
}))

vi.mock('../../logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

const { mockSpan } = vi.hoisted(() => ({
  mockSpan: {
    setAttribute: vi.fn(),
    setAttributes: vi.fn(),
    end: vi.fn(),
  },
}))

vi.mock('@sentry/electron/main', () => ({
  startSpanManual: vi.fn((_options, callback) => callback(mockSpan)),
}))

const { mockGetFeatureFlag } = vi.hoisted(() => ({
  mockGetFeatureFlag: vi.fn().mockReturnValue(true),
}))

vi.mock('../../feature-flags', () => ({
  getFeatureFlag: mockGetFeatureFlag,
}))

vi.mock('../../../../utils/feature-flags', () => ({
  featureFlagKeys: {
    CLI_VALIDATION_ENFORCE: 'cli_validation_enforce',
  },
}))

describe('path-configurator', () => {
  beforeEach(() => {
    vol.reset()
    vi.clearAllMocks()
    // Reset span mock
    mockSpan.setAttribute.mockClear()
    mockSpan.setAttributes.mockClear()
    mockSpan.end.mockClear()
    // Default to non-Windows
    vi.stubGlobal('process', {
      ...process,
      platform: 'darwin',
      env: { ...process.env, SHELL: '/bin/zsh' },
    })
    // Default mock for execAsync (shell detection)
    mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' })
    // Default feature flag to enabled
    mockGetFeatureFlag.mockReturnValue(true)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  describe('configureShellPath', () => {
    it('creates shell RC file if it does not exist', async () => {
      const result = await configureShellPath()

      expect(result.success).toBe(true)
      expect(vol.existsSync('/home/testuser/.zshrc')).toBe(true)
    })

    it('adds path block to existing shell RC file', async () => {
      vol.fromJSON({
        '/home/testuser/.zshrc': '# My zsh config\nalias ll="ls -la"\n',
      })

      const result = await configureShellPath()

      expect(result.success).toBe(true)
      const content = vol.readFileSync('/home/testuser/.zshrc', 'utf8')
      expect(content).toContain('# Added by ToolHive UI')
      expect(content).toContain('export PATH="$HOME/.toolhive/bin:$PATH"')
      expect(content).toContain('# End ToolHive UI')
    })

    it('does not duplicate path block if already configured', async () => {
      const existingContent = `# My config
# Added by ToolHive UI - do not modify this block
export PATH="$HOME/.toolhive/bin:$PATH"
# End ToolHive UI
`
      vol.fromJSON({
        '/home/testuser/.zshrc': existingContent,
      })

      const result = await configureShellPath()

      expect(result.success).toBe(true)
      const content = vol.readFileSync(
        '/home/testuser/.zshrc',
        'utf8'
      ) as string
      // Should not have duplicate markers
      const markerCount = (content.match(/# Added by ToolHive UI/g) || [])
        .length
      expect(markerCount).toBe(1)
    })

    it('configures multiple shells if their RC files exist', async () => {
      vol.fromJSON({
        '/home/testuser/.zshrc': '# zsh config',
        '/home/testuser/.bashrc': '# bash config',
      })

      const result = await configureShellPath()

      expect(result.success).toBe(true)
      expect(result.modifiedFiles).toContain('/home/testuser/.zshrc')
      expect(result.modifiedFiles).toContain('/home/testuser/.bashrc')
    })

    it('uses fish syntax for fish shell config', async () => {
      vi.stubGlobal('process', {
        ...process,
        platform: 'darwin',
        env: { ...process.env, SHELL: '/usr/local/bin/fish' },
      })

      vol.fromJSON({
        '/home/testuser/.config/fish/config.fish': '# fish config',
      })

      const result = await configureShellPath()

      expect(result.success).toBe(true)
      const content = vol.readFileSync(
        '/home/testuser/.config/fish/config.fish',
        'utf8'
      )
      expect(content).toContain('fish_add_path -g $HOME/.toolhive/bin')
    })

    it('creates parent directories if needed', async () => {
      vi.stubGlobal('process', {
        ...process,
        platform: 'darwin',
        env: { ...process.env, SHELL: '/usr/local/bin/fish' },
      })

      // Fish config directory doesn't exist
      vol.fromJSON({})

      const result = await configureShellPath()

      expect(result.success).toBe(true)
      expect(vol.existsSync('/home/testuser/.config/fish')).toBe(true)
    })

    it('skips PATH modification when feature flag is disabled but still records shell in span', async () => {
      mockGetFeatureFlag.mockReturnValue(false)

      vol.fromJSON({
        '/home/testuser/.zshrc': '# My zsh config\nalias ll="ls -la"\n',
      })

      const result = await configureShellPath()

      expect(result.success).toBe(false)
      expect(result.modifiedFiles).toHaveLength(0)
      // Should still record detected shell in span
      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        'cli.detected_shell',
        'zsh'
      )
      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        'cli.feature_flag_enabled',
        false
      )
      expect(mockSpan.setAttributes).toHaveBeenCalledWith({
        'cli.path_configured': false,
        'cli.skipped_reason': 'feature_flag_disabled',
      })
      expect(mockSpan.end).toHaveBeenCalled()
      // File should not be modified
      const content = vol.readFileSync('/home/testuser/.zshrc', 'utf8')
      expect(content).not.toContain('# Added by ToolHive UI')
    })
  })

  describe('removeShellPath', () => {
    it('removes path block from shell RC files', async () => {
      const contentWithBlock = `# My config

# Added by ToolHive UI - do not modify this block
export PATH="$HOME/.toolhive/bin:$PATH"
# End ToolHive UI

alias ll="ls -la"
`
      vol.fromJSON({
        '/home/testuser/.zshrc': contentWithBlock,
      })

      const result = await removeShellPath()

      expect(result.success).toBe(true)
      const content = vol.readFileSync('/home/testuser/.zshrc', 'utf8')
      expect(content).not.toContain('# Added by ToolHive UI')
      expect(content).not.toContain('export PATH="$HOME/.toolhive/bin:$PATH"')
      expect(content).toContain('alias ll="ls -la"')
    })

    it('handles files without path block', async () => {
      vol.fromJSON({
        '/home/testuser/.zshrc': '# Just a regular config\nalias ll="ls -la"',
      })

      const result = await removeShellPath()

      expect(result.success).toBe(true)
      const content = vol.readFileSync('/home/testuser/.zshrc', 'utf8')
      expect(content).toContain('alias ll="ls -la"')
    })

    it('handles non-existent files', async () => {
      vol.fromJSON({})

      const result = await removeShellPath()

      expect(result.success).toBe(true)
    })

    it('removes from all shell RC files', async () => {
      const blockContent = `
# Added by ToolHive UI - do not modify this block
export PATH="$HOME/.toolhive/bin:$PATH"
# End ToolHive UI
`
      vol.fromJSON({
        '/home/testuser/.zshrc': `# zsh${blockContent}`,
        '/home/testuser/.bashrc': `# bash${blockContent}`,
        '/home/testuser/.bash_profile': `# profile${blockContent}`,
      })

      const result = await removeShellPath()

      expect(result.success).toBe(true)
      expect(vol.readFileSync('/home/testuser/.zshrc', 'utf8')).not.toContain(
        '# Added by ToolHive UI'
      )
      expect(vol.readFileSync('/home/testuser/.bashrc', 'utf8')).not.toContain(
        '# Added by ToolHive UI'
      )
      expect(
        vol.readFileSync('/home/testuser/.bash_profile', 'utf8')
      ).not.toContain('# Added by ToolHive UI')
    })
  })

  describe('checkPathConfiguration', () => {
    it('returns isConfigured: true when path block exists', async () => {
      vol.fromJSON({
        '/home/testuser/.zshrc': `# config
# Added by ToolHive UI - do not modify this block
export PATH="$HOME/.toolhive/bin:$PATH"
# End ToolHive UI
`,
      })

      const result = await checkPathConfiguration()

      expect(result.isConfigured).toBe(true)
      expect(result.modifiedFiles).toContain('/home/testuser/.zshrc')
    })

    it('returns isConfigured: false when no path block exists', async () => {
      vol.fromJSON({
        '/home/testuser/.zshrc': '# Just regular config',
      })

      const result = await checkPathConfiguration()

      expect(result.isConfigured).toBe(false)
      expect(result.modifiedFiles).toHaveLength(0)
    })

    it('returns isConfigured: false when no RC files exist', async () => {
      vol.fromJSON({})

      const result = await checkPathConfiguration()

      expect(result.isConfigured).toBe(false)
    })

    it('finds configuration in any shell RC file', async () => {
      vol.fromJSON({
        '/home/testuser/.zshrc': '# no config here',
        '/home/testuser/.bashrc': `# bash config
# Added by ToolHive UI - do not modify this block
export PATH="$HOME/.toolhive/bin:$PATH"
# End ToolHive UI
`,
      })

      const result = await checkPathConfiguration()

      expect(result.isConfigured).toBe(true)
      expect(result.modifiedFiles).toContain('/home/testuser/.bashrc')
      expect(result.modifiedFiles).not.toContain('/home/testuser/.zshrc')
    })

    it('returns pathEntry in result', async () => {
      vol.fromJSON({})

      const result = await checkPathConfiguration()

      expect(result.pathEntry).toBe('export PATH="$HOME/.toolhive/bin:$PATH"')
    })
  })

  describe('Windows platform', () => {
    const localAppData = 'C:\\Users\\test\\AppData\\Local'
    // Use path.join to get the same path format the code computes
    const toolhiveBinPath = path.join(localAppData, 'ToolHive', 'bin')

    beforeEach(() => {
      vi.stubGlobal('process', {
        ...process,
        platform: 'win32',
        env: {
          ...process.env,
          LOCALAPPDATA: localAppData,
        },
      })
    })

    it('configureShellPath calls PowerShell to modify PATH', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' })

      const result = await configureShellPath()

      expect(result.success).toBe(true)
      expect(result.modifiedFiles).toContain('Windows User PATH')
      expect(mockExecAsync).toHaveBeenCalled()
    })

    it('configureShellPath detects already configured PATH', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: `${toolhiveBinPath};C:\\Windows`,
        stderr: '',
      })

      const result = await configureShellPath()

      expect(result.success).toBe(true)
      // Should detect already configured and not error
    })

    it('removeShellPath calls PowerShell to remove from PATH', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' })

      const result = await removeShellPath()

      expect(result.success).toBe(true)
      expect(result.modifiedFiles).toContain('Windows User PATH')
    })

    it('checkPathConfiguration queries Windows user PATH', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: `${toolhiveBinPath};C:\\Windows`,
        stderr: '',
      })

      const result = await checkPathConfiguration()

      expect(result.isConfigured).toBe(true)
      expect(result.modifiedFiles).toContain('Windows User PATH')
    })

    it('checkPathConfiguration returns false when not in PATH', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'C:\\Windows;C:\\Program Files',
        stderr: '',
      })

      const result = await checkPathConfiguration()

      expect(result.isConfigured).toBe(false)
    })

    it('skips PATH modification when feature flag is disabled on Windows', async () => {
      mockGetFeatureFlag.mockReturnValue(false)
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' })

      const result = await configureShellPath()

      expect(result.success).toBe(false)
      expect(result.modifiedFiles).toHaveLength(0)
      // Should record in span
      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        'cli.feature_flag_enabled',
        false
      )
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('cli.is_windows', true)
      expect(mockSpan.setAttributes).toHaveBeenCalledWith({
        'cli.path_configured': false,
        'cli.skipped_reason': 'feature_flag_disabled',
      })
      expect(mockSpan.end).toHaveBeenCalled()
      // PowerShell should NOT be called
      expect(mockExecAsync).not.toHaveBeenCalled()
    })
  })
})
