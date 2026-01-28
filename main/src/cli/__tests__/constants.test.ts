import { describe, it, expect, vi } from 'vitest'
import {
  EXTERNAL_CLI_PATHS,
  getDesktopCliPath,
  getMarkerFilePath,
  getShellRcFiles,
  getCliSourceFromPath,
  getUninstallInstructions,
  SHELL_PATH_ENTRY,
  SHELL_PATH_MARKERS,
  FISH_PATH_ENTRY,
} from '../constants'

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
  },
}))

// Mock os.homedir with importOriginal
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

describe('constants', () => {
  describe('EXTERNAL_CLI_PATHS', () => {
    it('has darwin paths', () => {
      expect(EXTERNAL_CLI_PATHS.darwin).toContain('/opt/homebrew/bin/thv')
      expect(EXTERNAL_CLI_PATHS.darwin).toContain('/usr/local/bin/thv')
    })

    it('has linux paths', () => {
      expect(EXTERNAL_CLI_PATHS.linux).toContain(
        '/home/linuxbrew/.linuxbrew/bin/thv'
      )
      expect(EXTERNAL_CLI_PATHS.linux).toContain('/usr/local/bin/thv')
      expect(EXTERNAL_CLI_PATHS.linux).toContain('/usr/bin/thv')
    })

    it('has win32 paths', () => {
      expect(EXTERNAL_CLI_PATHS.win32.length).toBeGreaterThan(0)
    })
  })

  describe('getDesktopCliPath', () => {
    it('returns correct path for darwin', () => {
      const path = getDesktopCliPath('darwin')
      expect(path).toBe('/home/testuser/.toolhive/bin/thv')
    })

    it('returns correct path for linux', () => {
      const path = getDesktopCliPath('linux')
      expect(path).toBe('/home/testuser/.toolhive/bin/thv')
    })

    it('returns correct path for win32', () => {
      const path = getDesktopCliPath('win32')
      expect(path).toContain('ToolHive')
      expect(path).toContain('bin')
      expect(path).toContain('thv.exe')
    })

    it('throws for unsupported platform', () => {
      expect(() => getDesktopCliPath('freebsd' as 'darwin')).toThrow(
        'Unsupported platform'
      )
    })
  })

  describe('getMarkerFilePath', () => {
    it('returns correct marker file path', () => {
      const path = getMarkerFilePath()
      expect(path).toBe('/home/testuser/.toolhive/.cli-source')
    })
  })

  describe('getShellRcFiles', () => {
    it('returns bash RC files', () => {
      const files = getShellRcFiles()
      expect(files.bash).toContain('/home/testuser/.bashrc')
      expect(files.bash).toContain('/home/testuser/.bash_profile')
    })

    it('returns zsh RC files', () => {
      const files = getShellRcFiles()
      expect(files.zsh).toContain('/home/testuser/.zshrc')
    })

    it('returns fish RC files', () => {
      const files = getShellRcFiles()
      expect(files.fish).toContain('/home/testuser/.config/fish/config.fish')
    })
  })

  describe('SHELL_PATH_ENTRY', () => {
    it('contains PATH export', () => {
      expect(SHELL_PATH_ENTRY).toContain('export PATH')
      expect(SHELL_PATH_ENTRY).toContain('.toolhive/bin')
    })
  })

  describe('SHELL_PATH_MARKERS', () => {
    it('has start and end markers', () => {
      expect(SHELL_PATH_MARKERS.start).toContain('ToolHive Studio')
      expect(SHELL_PATH_MARKERS.end).toContain('End ToolHive Studio')
    })
  })

  describe('FISH_PATH_ENTRY', () => {
    it('uses fish_add_path', () => {
      expect(FISH_PATH_ENTRY).toContain('fish_add_path')
      expect(FISH_PATH_ENTRY).toContain('.toolhive/bin')
    })
  })

  describe('getCliSourceFromPath', () => {
    it('detects homebrew on darwin', () => {
      expect(getCliSourceFromPath('/opt/homebrew/bin/thv', 'darwin')).toBe(
        'homebrew'
      )
    })

    it('detects homebrew from /opt/homebrew path', () => {
      expect(
        getCliSourceFromPath(
          '/opt/homebrew/Cellar/toolhive/1.0/bin/thv',
          'darwin'
        )
      ).toBe('homebrew')
    })

    it('returns manual for unknown paths on darwin', () => {
      expect(getCliSourceFromPath('/some/random/path/thv', 'darwin')).toBe(
        'manual'
      )
    })

    it('detects linuxbrew on linux', () => {
      expect(
        getCliSourceFromPath('/home/linuxbrew/.linuxbrew/bin/thv', 'linux')
      ).toBe('homebrew')
    })

    it('returns manual for unknown paths on linux', () => {
      expect(getCliSourceFromPath('/opt/custom/thv', 'linux')).toBe('manual')
    })
  })

  describe('getUninstallInstructions', () => {
    it('returns homebrew instructions', () => {
      const instructions = getUninstallInstructions('homebrew')
      expect(instructions).toContain('brew uninstall')
    })

    it('returns winget instructions', () => {
      const instructions = getUninstallInstructions('winget')
      expect(instructions).toContain('winget uninstall')
    })

    it('returns manual instructions', () => {
      const instructions = getUninstallInstructions('manual')
      expect(instructions).toContain('manually remove')
    })
  })
})
