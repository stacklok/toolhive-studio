import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validateCliAlignment,
  handleValidationResult,
  getCliAlignmentStatus,
  repairCliSymlink,
} from '../validation'

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
  getMarkerTargetPath: vi.fn(() => '/app/resources/bin/darwin-arm64/thv'),
  isFlatpak: vi.fn(() => false),
  repairSymlink: vi.fn(),
}))

vi.mock('../path-configurator', () => ({
  configureShellPath: vi.fn(),
  checkPathConfiguration: vi.fn(),
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
    quit: vi.fn(),
  },
}))

vi.mock('@sentry/electron/main', () => ({
  startSpanManual: vi.fn((_options, callback) =>
    callback({ setAttributes: vi.fn(), setAttribute: vi.fn(), end: vi.fn() })
  ),
  startSpan: vi.fn((_options, callback) => callback()),
}))

import { detectExternalCli, getCliInfo } from '../cli-detection'
import { readMarkerFile, createMarkerForDesktopInstall } from '../marker-file'
import {
  checkSymlink,
  createSymlink,
  getBundledCliPath,
  repairSymlink,
} from '../symlink-manager'
import {
  configureShellPath,
  checkPathConfiguration,
} from '../path-configurator'
import type { ExternalCliInfo } from '@common/types/cli'

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
const mockCheckPathConfiguration = vi.mocked(checkPathConfiguration)

describe('validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetBundledCliPath.mockReturnValue('/app/resources/bin/thv')
    // Default mock for checkPathConfiguration
    mockCheckPathConfiguration.mockResolvedValue({
      isConfigured: true,
      modifiedFiles: [],
      pathEntry: '/home/testuser/.toolhive/bin',
    })
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
    it('returns valid status for valid input', async () => {
      // Mock marker with same desktop version so no update is needed
      mockReadMarkerFile.mockReturnValue({
        schema_version: 1,
        source: 'desktop',
        install_method: 'symlink',
        cli_version: '1.0.0',
        installed_at: '2024-01-01',
        desktop_version: '1.0.0', // Same as app.getVersion() mock
      })

      const result = await handleValidationResult({ status: 'valid' }, 'darwin')

      expect(result.status).toBe('valid')
    })

    it('passes through external-cli-found for renderer to handle', async () => {
      const externalCli: ExternalCliInfo = {
        path: '/opt/homebrew/bin/thv',
        version: '1.0.0',
        source: 'homebrew',
      }

      const result = await handleValidationResult(
        { status: 'external-cli-found', cli: externalCli },
        'darwin'
      )

      expect(result.status).toBe('external-cli-found')
      if (result.status === 'external-cli-found') {
        expect(result.cli).toEqual(externalCli)
      }
    })

    it('passes through symlink-broken for renderer to handle', async () => {
      const result = await handleValidationResult(
        { status: 'symlink-broken', target: '/old/path' },
        'darwin'
      )

      expect(result.status).toBe('symlink-broken')
      if (result.status === 'symlink-broken') {
        expect(result.target).toBe('/old/path')
      }
    })

    it('passes through symlink-tampered for renderer to handle', async () => {
      const result = await handleValidationResult(
        { status: 'symlink-tampered', target: '/other/path' },
        'darwin'
      )

      expect(result.status).toBe('symlink-tampered')
      if (result.status === 'symlink-tampered') {
        expect(result.target).toBe('/other/path')
      }
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
      expect(result.status).toBe('valid')
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
      expect(result.status).toBe('valid')
    })

    it('returns original status when fresh install fails', async () => {
      mockCreateSymlink.mockReturnValue({
        success: false,
        error: 'Permission denied',
      })

      const result = await handleValidationResult(
        { status: 'fresh-install' },
        'darwin'
      )

      expect(result.status).toBe('fresh-install')
    })

    it('recopies CLI on Windows when desktop version changes', async () => {
      // Marker with old desktop version triggers needsUpdate
      mockReadMarkerFile.mockReturnValue({
        schema_version: 1,
        source: 'desktop',
        install_method: 'copy',
        cli_version: '0.9.0',
        cli_checksum: 'old-checksum',
        installed_at: '2024-01-01',
        desktop_version: '0.9.0', // Different from app.getVersion() mock (1.0.0)
      })
      mockCreateSymlink.mockReturnValue({
        success: true,
        checksum: 'new-checksum',
      })
      mockGetCliInfo.mockResolvedValue({
        exists: true,
        version: '1.0.0',
        isExecutable: true,
      })
      mockCreateMarkerForDesktopInstall.mockReturnValue(true)

      const result = await handleValidationResult({ status: 'valid' }, 'win32')

      expect(mockCreateSymlink).toHaveBeenCalledWith('win32')
      expect(mockCreateMarkerForDesktopInstall).toHaveBeenCalledWith({
        cliVersion: '1.0.0',
        cliChecksum: 'new-checksum',
        platform: 'win32',
      })
      expect(result.status).toBe('valid')
    })

    it('does not recopy CLI on macOS/Linux when desktop version changes', async () => {
      // Marker with old desktop version triggers needsUpdate
      mockReadMarkerFile.mockReturnValue({
        schema_version: 1,
        source: 'desktop',
        install_method: 'symlink',
        cli_version: '0.9.0',
        cli_checksum: 'old-checksum',
        installed_at: '2024-01-01',
        desktop_version: '0.9.0', // Different from app.getVersion() mock (1.0.0)
      })
      mockGetCliInfo.mockResolvedValue({
        exists: true,
        version: '1.0.0',
        isExecutable: true,
      })
      mockCreateMarkerForDesktopInstall.mockReturnValue(true)

      const result = await handleValidationResult({ status: 'valid' }, 'darwin')

      // Should NOT call createSymlink on macOS - symlink auto-updates
      expect(mockCreateSymlink).not.toHaveBeenCalled()
      expect(mockCreateMarkerForDesktopInstall).toHaveBeenCalledWith({
        cliVersion: '1.0.0',
        symlinkTarget: '/app/resources/bin/darwin-arm64/thv',
        cliChecksum: 'old-checksum',
        platform: 'darwin',
        flatpakTarget: undefined,
      })
      expect(result.status).toBe('valid')
    })

    it('does not update marker when Windows CLI recopy fails', async () => {
      mockReadMarkerFile.mockReturnValue({
        schema_version: 1,
        source: 'desktop',
        install_method: 'copy',
        cli_version: '0.9.0',
        cli_checksum: 'old-checksum',
        installed_at: '2024-01-01',
        desktop_version: '0.9.0',
      })
      mockCreateSymlink.mockReturnValue({
        success: false,
        error: 'Permission denied',
      })

      const result = await handleValidationResult({ status: 'valid' }, 'win32')

      expect(mockCreateSymlink).toHaveBeenCalledWith('win32')
      // Marker should NOT be updated when recopy fails - allows retry on next launch
      expect(mockCreateMarkerForDesktopInstall).not.toHaveBeenCalled()
      expect(result.status).toBe('valid')
    })
  })

  describe('repairCliSymlink', () => {
    it('repairs symlink and updates marker', async () => {
      mockRepairSymlink.mockReturnValue({ success: true, checksum: 'abc123' })
      mockGetCliInfo.mockResolvedValue({
        exists: true,
        version: '1.0.0',
        isExecutable: true,
      })

      const result = await repairCliSymlink('darwin')

      expect(mockRepairSymlink).toHaveBeenCalledWith('darwin')
      expect(mockCreateMarkerForDesktopInstall).toHaveBeenCalled()
      expect(result.success).toBe(true)
    })

    it('returns error when repair fails', async () => {
      mockRepairSymlink.mockReturnValue({
        success: false,
        error: 'Permission denied',
      })

      const result = await repairCliSymlink('darwin')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Permission denied')
      expect(mockCreateMarkerForDesktopInstall).not.toHaveBeenCalled()
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
