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
    bash: ['/home/testuser/.bashrc'],
    zsh: ['/home/testuser/.zshrc'],
    fish: ['/home/testuser/.config/fish/config.fish'],
  }),
  LEGACY_BASH_PROFILE_PATH: '/home/testuser/.bash_profile',
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

    it('bash user: only writes to .bashrc, not .bash_profile', async () => {
      vi.stubGlobal('process', {
        ...process,
        platform: 'darwin',
        env: { ...process.env, SHELL: '/bin/bash' },
      })

      vol.fromJSON({
        '/home/testuser/.bashrc': '# bash config',
        '/home/testuser/.bash_profile': '# profile config',
      })

      const result = await configureShellPath()

      expect(result.success).toBe(true)
      const bashrc = vol.readFileSync('/home/testuser/.bashrc', 'utf8')
      expect(bashrc).toContain('# Added by ToolHive UI')

      const profile = vol.readFileSync(
        '/home/testuser/.bash_profile',
        'utf8'
      ) as string
      expect(profile).not.toContain('# Added by ToolHive UI')
      expect(profile).toBe('# profile config')
    })

    it('bash user: cleans up legacy .bash_profile block', async () => {
      vi.stubGlobal('process', {
        ...process,
        platform: 'darwin',
        env: { ...process.env, SHELL: '/bin/bash' },
      })

      const pathBlock = `
# Added by ToolHive UI - do not modify this block
export PATH="$HOME/.toolhive/bin:$PATH"
# End ToolHive UI
`
      vol.fromJSON({
        '/home/testuser/.bashrc': `# bash config${pathBlock}`,
        '/home/testuser/.bash_profile': `# profile config${pathBlock}`,
      })

      const result = await configureShellPath()

      expect(result.success).toBe(true)

      const bashrc = vol.readFileSync(
        '/home/testuser/.bashrc',
        'utf8'
      ) as string
      expect(bashrc).toContain('# Added by ToolHive UI')
      const bashrcMarkers = (bashrc.match(/# Added by ToolHive UI/g) || [])
        .length
      expect(bashrcMarkers).toBe(1)

      const profile = vol.readFileSync(
        '/home/testuser/.bash_profile',
        'utf8'
      ) as string
      expect(profile).not.toContain('# Added by ToolHive UI')
    })

    it('bash user: does not modify .bash_profile when it has no ToolHive block', async () => {
      vi.stubGlobal('process', {
        ...process,
        platform: 'darwin',
        env: { ...process.env, SHELL: '/bin/bash' },
      })

      vol.fromJSON({
        '/home/testuser/.bashrc': '# bash config',
        '/home/testuser/.bash_profile': '# profile config - no toolhive block',
      })

      await configureShellPath()

      // .bash_profile should be byte-for-byte unchanged
      expect(vol.readFileSync('/home/testuser/.bash_profile', 'utf8')).toBe(
        '# profile config - no toolhive block'
      )
    })

    it('bash user: creates .bashrc when neither file exists', async () => {
      vi.stubGlobal('process', {
        ...process,
        platform: 'darwin',
        env: { ...process.env, SHELL: '/bin/bash' },
      })

      vol.fromJSON({})

      const result = await configureShellPath()

      expect(result.success).toBe(true)
      expect(vol.existsSync('/home/testuser/.bashrc')).toBe(true)
      expect(vol.existsSync('/home/testuser/.bash_profile')).toBe(false)

      const bashrc = vol.readFileSync('/home/testuser/.bashrc', 'utf8')
      expect(bashrc).toContain('# Added by ToolHive UI')
    })

    it('non-default shell with existing .bashrc writes to .bashrc only', async () => {
      vol.fromJSON({
        '/home/testuser/.zshrc': '# zsh config',
        '/home/testuser/.bashrc': '# bash config',
        '/home/testuser/.bash_profile': '# profile config',
      })

      const result = await configureShellPath()

      expect(result.success).toBe(true)
      expect(result.modifiedFiles).toContain('/home/testuser/.zshrc')
      expect(result.modifiedFiles).toContain('/home/testuser/.bashrc')

      const profile = vol.readFileSync(
        '/home/testuser/.bash_profile',
        'utf8'
      ) as string
      expect(profile).not.toContain('# Added by ToolHive UI')
      expect(profile).toBe('# profile config')
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
      })

      const result = await removeShellPath()

      expect(result.success).toBe(true)
      expect(vol.readFileSync('/home/testuser/.zshrc', 'utf8')).not.toContain(
        '# Added by ToolHive UI'
      )
      expect(vol.readFileSync('/home/testuser/.bashrc', 'utf8')).not.toContain(
        '# Added by ToolHive UI'
      )
    })

    it('removes legacy .bash_profile block even though it is not in getShellRcFiles', async () => {
      const blockContent = `
# Added by ToolHive UI - do not modify this block
export PATH="$HOME/.toolhive/bin:$PATH"
# End ToolHive UI
`
      vol.fromJSON({
        '/home/testuser/.bash_profile': `# profile${blockContent}`,
      })

      const result = await removeShellPath()

      expect(result.success).toBe(true)
      expect(
        vol.readFileSync('/home/testuser/.bash_profile', 'utf8')
      ).not.toContain('# Added by ToolHive UI')
    })

    it('removes from both .bashrc and legacy .bash_profile', async () => {
      const blockContent = `
# Added by ToolHive UI - do not modify this block
export PATH="$HOME/.toolhive/bin:$PATH"
# End ToolHive UI
`
      vol.fromJSON({
        '/home/testuser/.bashrc': `# bash${blockContent}`,
        '/home/testuser/.bash_profile': `# profile${blockContent}`,
      })

      const result = await removeShellPath()

      expect(result.success).toBe(true)
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

    it('detects legacy .bash_profile configuration', async () => {
      vol.fromJSON({
        '/home/testuser/.bash_profile': `# profile
# Added by ToolHive UI - do not modify this block
export PATH="$HOME/.toolhive/bin:$PATH"
# End ToolHive UI
`,
      })

      const result = await checkPathConfiguration()

      expect(result.isConfigured).toBe(true)
      expect(result.modifiedFiles).toContain('/home/testuser/.bash_profile')
    })

    it('reports both files if .bashrc and legacy .bash_profile have blocks', async () => {
      const pathBlock = `
# Added by ToolHive UI - do not modify this block
export PATH="$HOME/.toolhive/bin:$PATH"
# End ToolHive UI
`
      vol.fromJSON({
        '/home/testuser/.bashrc': `# bash${pathBlock}`,
        '/home/testuser/.bash_profile': `# profile${pathBlock}`,
      })

      const result = await checkPathConfiguration()

      expect(result.isConfigured).toBe(true)
      expect(result.modifiedFiles).toContain('/home/testuser/.bashrc')
      expect(result.modifiedFiles).toContain('/home/testuser/.bash_profile')
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
  })
})
