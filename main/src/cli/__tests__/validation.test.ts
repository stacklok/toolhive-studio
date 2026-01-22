import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validateCliAlignment,
  handleValidationResult,
  getCliAlignmentStatus,
} from '../validation'
import type { ExternalCliInfo } from '../types'

// Mock all dependencies
vi.mock('../cli-detection', () => ({
  detectExternalCli: vi.fn(),
  getCliInfo: vi.fn(),
}))

vi.mock('../marker-file', () => ({
  readMarkerFile: vi.fn(),
  createMarkerForDesktopInstall: vi.fn(),
}))

vi.mock('../symlink-manager', () => ({
  checkSymlink: vi.fn(),
  createSymlink: vi.fn(),
  getBundledCliPath: vi.fn(),
  repairSymlink: vi.fn(),
}))

vi.mock('../path-configurator', () => ({
  configureShellPath: vi.fn(),
}))

vi.mock('../dialogs', () => ({
  showExternalCliDialog: vi.fn(),
  showSymlinkBrokenDialog: vi.fn(),
  showSymlinkTamperedDialog: vi.fn(),
}))

vi.mock('../constants', () => ({
  getDesktopCliPath: () => '/home/testuser/.toolhive/bin/thv',
}))

vi.mock('../../logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getVersion: () => '1.0.0',
  },
}))

import { detectExternalCli, getCliInfo } from '../cli-detection'
import { readMarkerFile, createMarkerForDesktopInstall } from '../marker-file'
import {
  checkSymlink,
  createSymlink,
  getBundledCliPath,
  repairSymlink,
} from '../symlink-manager'
import { configureShellPath } from '../path-configurator'
import {
  showExternalCliDialog,
  showSymlinkBrokenDialog,
  showSymlinkTamperedDialog,
} from '../dialogs'

const mockDetectExternalCli = vi.mocked(detectExternalCli)
const mockReadMarkerFile = vi.mocked(readMarkerFile)
const mockCheckSymlink = vi.mocked(checkSymlink)
const mockCreateSymlink = vi.mocked(createSymlink)
const mockGetBundledCliPath = vi.mocked(getBundledCliPath)
const mockRepairSymlink = vi.mocked(repairSymlink)
const mockGetCliInfo = vi.mocked(getCliInfo)
const mockCreateMarkerForDesktopInstall = vi.mocked(
  createMarkerForDesktopInstall
)
const mockConfigureShellPath = vi.mocked(configureShellPath)
const mockShowExternalCliDialog = vi.mocked(showExternalCliDialog)
const mockShowSymlinkBrokenDialog = vi.mocked(showSymlinkBrokenDialog)
const mockShowSymlinkTamperedDialog = vi.mocked(showSymlinkTamperedDialog)

describe('validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetBundledCliPath.mockReturnValue('/app/resources/bin/thv')
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('validateCliAlignment', () => {
    it('returns external-cli-found when external CLI detected', async () => {
      const externalCli: ExternalCliInfo = {
        path: '/opt/homebrew/bin/thv',
        version: '1.0.0',
        source: 'homebrew',
      }
      mockDetectExternalCli.mockResolvedValue(externalCli)

      const result = await validateCliAlignment('darwin')

      expect(result.status).toBe('external-cli-found')
      if (result.status === 'external-cli-found') {
        expect(result.cli).toEqual(externalCli)
      }
    })

    it('returns fresh-install when no marker file', async () => {
      mockDetectExternalCli.mockResolvedValue(null)
      mockReadMarkerFile.mockReturnValue(null)

      const result = await validateCliAlignment('darwin')

      expect(result.status).toBe('fresh-install')
    })

    it('returns symlink-missing when symlink does not exist', async () => {
      mockDetectExternalCli.mockResolvedValue(null)
      mockReadMarkerFile.mockReturnValue({
        schema_version: 1,
        source: 'desktop',
        install_method: 'symlink',
        cli_version: '1.0.0',
        installed_at: '2024-01-01',
        desktop_version: '1.0.0',
      })
      mockCheckSymlink.mockReturnValue({
        exists: false,
        targetExists: false,
        target: null,
        isOurBinary: false,
      })

      const result = await validateCliAlignment('darwin')

      expect(result.status).toBe('symlink-missing')
    })

    it('returns symlink-broken when target does not exist', async () => {
      mockDetectExternalCli.mockResolvedValue(null)
      mockReadMarkerFile.mockReturnValue({
        schema_version: 1,
        source: 'desktop',
        install_method: 'symlink',
        cli_version: '1.0.0',
        installed_at: '2024-01-01',
        desktop_version: '1.0.0',
      })
      mockCheckSymlink.mockReturnValue({
        exists: true,
        targetExists: false,
        target: '/old/path/thv',
        isOurBinary: false,
      })

      const result = await validateCliAlignment('darwin')

      expect(result.status).toBe('symlink-broken')
      if (result.status === 'symlink-broken') {
        expect(result.target).toBe('/old/path/thv')
      }
    })

    it('returns symlink-tampered when target is not our binary', async () => {
      mockDetectExternalCli.mockResolvedValue(null)
      mockReadMarkerFile.mockReturnValue({
        schema_version: 1,
        source: 'desktop',
        install_method: 'symlink',
        cli_version: '1.0.0',
        installed_at: '2024-01-01',
        desktop_version: '1.0.0',
      })
      mockCheckSymlink.mockReturnValue({
        exists: true,
        targetExists: true,
        target: '/some/other/thv',
        isOurBinary: false,
      })

      const result = await validateCliAlignment('darwin')

      expect(result.status).toBe('symlink-tampered')
    })

    it('returns valid when everything is correct', async () => {
      mockDetectExternalCli.mockResolvedValue(null)
      mockReadMarkerFile.mockReturnValue({
        schema_version: 1,
        source: 'desktop',
        install_method: 'symlink',
        cli_version: '1.0.0',
        installed_at: '2024-01-01',
        desktop_version: '1.0.0',
      })
      mockCheckSymlink.mockReturnValue({
        exists: true,
        targetExists: true,
        target: '/app/resources/bin/thv',
        isOurBinary: true,
      })

      const result = await validateCliAlignment('darwin')

      expect(result.status).toBe('valid')
    })
  })

  describe('handleValidationResult', () => {
    it('returns true for valid status', async () => {
      const result = await handleValidationResult({ status: 'valid' }, 'darwin')

      expect(result).toBe(true)
    })

    it('shows dialog and returns false for external CLI', async () => {
      const externalCli: ExternalCliInfo = {
        path: '/opt/homebrew/bin/thv',
        version: '1.0.0',
        source: 'homebrew',
      }
      mockShowExternalCliDialog.mockReturnValue('quit')

      const result = await handleValidationResult(
        { status: 'external-cli-found', cli: externalCli },
        'darwin'
      )

      expect(mockShowExternalCliDialog).toHaveBeenCalledWith(externalCli)
      expect(result).toBe(false)
    })

    it('repairs symlink when user accepts broken dialog', async () => {
      mockShowSymlinkBrokenDialog.mockReturnValue(true)
      mockRepairSymlink.mockReturnValue({ success: true })

      const result = await handleValidationResult(
        { status: 'symlink-broken', target: '/old/path' },
        'darwin'
      )

      expect(mockShowSymlinkBrokenDialog).toHaveBeenCalled()
      expect(mockRepairSymlink).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('returns false when user declines broken dialog', async () => {
      mockShowSymlinkBrokenDialog.mockReturnValue(false)

      const result = await handleValidationResult(
        { status: 'symlink-broken', target: '/old/path' },
        'darwin'
      )

      expect(result).toBe(false)
    })

    it('fixes symlink when user accepts tampered dialog', async () => {
      mockShowSymlinkTamperedDialog.mockReturnValue(true)
      mockRepairSymlink.mockReturnValue({ success: true })

      const result = await handleValidationResult(
        { status: 'symlink-tampered', target: '/other/path' },
        'darwin'
      )

      expect(mockShowSymlinkTamperedDialog).toHaveBeenCalled()
      expect(mockRepairSymlink).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('performs fresh install for fresh-install status', async () => {
      mockCreateSymlink.mockReturnValue({ success: true })
      mockGetCliInfo.mockResolvedValue({
        exists: true,
        version: '1.0.0',
        isExecutable: true,
      })
      mockCreateMarkerForDesktopInstall.mockReturnValue(true)
      mockConfigureShellPath.mockResolvedValue({
        success: true,
        modifiedFiles: [],
      })

      const result = await handleValidationResult(
        { status: 'fresh-install' },
        'darwin'
      )

      expect(mockCreateSymlink).toHaveBeenCalled()
      expect(mockCreateMarkerForDesktopInstall).toHaveBeenCalled()
      expect(mockConfigureShellPath).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('performs fresh install for symlink-missing status', async () => {
      mockCreateSymlink.mockReturnValue({ success: true })
      mockGetCliInfo.mockResolvedValue({
        exists: true,
        version: '1.0.0',
        isExecutable: true,
      })
      mockCreateMarkerForDesktopInstall.mockReturnValue(true)
      mockConfigureShellPath.mockResolvedValue({
        success: true,
        modifiedFiles: [],
      })

      const result = await handleValidationResult(
        { status: 'symlink-missing' },
        'darwin'
      )

      expect(mockCreateSymlink).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('returns false when fresh install fails', async () => {
      mockCreateSymlink.mockReturnValue({
        success: false,
        error: 'Permission denied',
      })

      const result = await handleValidationResult(
        { status: 'fresh-install' },
        'darwin'
      )

      expect(result).toBe(false)
    })
  })

  describe('getCliAlignmentStatus', () => {
    it('returns complete status information', async () => {
      mockReadMarkerFile.mockReturnValue({
        schema_version: 1,
        source: 'desktop',
        install_method: 'symlink',
        cli_version: '1.0.0',
        installed_at: '2024-01-01',
        desktop_version: '1.0.0',
      })
      mockCheckSymlink.mockReturnValue({
        exists: true,
        targetExists: true,
        target: '/app/resources/bin/thv',
        isOurBinary: true,
      })
      mockGetCliInfo.mockResolvedValue({
        exists: true,
        version: '1.2.0',
        isExecutable: true,
      })

      const status = await getCliAlignmentStatus('darwin')

      expect(status.isManaged).toBe(true)
      expect(status.cliPath).toBe('/home/testuser/.toolhive/bin/thv')
      expect(status.cliVersion).toBe('1.2.0')
      expect(status.installMethod).toBe('symlink')
      expect(status.symlinkTarget).toBe('/app/resources/bin/thv')
      expect(status.isValid).toBe(true)
      expect(status.lastValidated).toBeDefined()
    })

    it('returns unmanaged status when no marker', async () => {
      mockReadMarkerFile.mockReturnValue(null)
      mockCheckSymlink.mockReturnValue({
        exists: false,
        targetExists: false,
        target: null,
        isOurBinary: false,
      })
      mockGetCliInfo.mockResolvedValue({
        exists: false,
        version: null,
        isExecutable: false,
      })

      const status = await getCliAlignmentStatus('darwin')

      expect(status.isManaged).toBe(false)
      expect(status.isValid).toBe(false)
    })
  })
})
