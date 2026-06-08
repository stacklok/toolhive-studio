import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Shared mock methods so test assertions can read what was called on the Tray
// instance regardless of which `new Tray(...)` call produced it.
const trayMethods = {
  destroy: vi.fn(),
  isDestroyed: vi.fn(() => false),
  setToolTip: vi.fn(),
  setContextMenu: vi.fn(),
  on: vi.fn(),
}

// `new Tray(icon)` is called from setupTrayMenu — we need a real constructor,
// not an arrow function, so a class is the simplest path.
class TrayMock {
  destroy = trayMethods.destroy
  isDestroyed = trayMethods.isDestroyed
  setToolTip = trayMethods.setToolTip
  setContextMenu = trayMethods.setContextMenu
  on = trayMethods.on
}

const mockMenu = {
  buildFromTemplate: vi.fn((template: unknown) => ({ __template: template })),
}

const mockNativeImage = {
  createFromPath: vi.fn(() => ({
    setTemplateImage: vi.fn(),
    resize: vi.fn(() => ({})),
  })),
}

const mockApp = {
  isPackaged: false,
  getName: vi.fn(() => 'ToolHive'),
}

vi.mock('electron', () => ({
  Menu: mockMenu,
  Tray: TrayMock,
  app: mockApp,
  nativeImage: mockNativeImage,
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
}))

vi.mock('../auto-launch', () => ({
  getAutoLaunchStatus: vi.fn(() => false),
  setAutoLaunch: vi.fn(),
}))

vi.mock('../menu', () => ({
  createApplicationMenu: vi.fn(),
}))

vi.mock('../logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('../util', () => ({
  getAppVersion: vi.fn(() => '1.0.0'),
}))

vi.mock('../dock-utils', () => ({
  hideWindow: vi.fn(),
  showWindow: vi.fn(),
}))

const trayStore = { current: null as unknown }

vi.mock('../app-state', () => ({
  getTray: vi.fn(() => trayStore.current),
  setTray: vi.fn((tray: unknown) => {
    trayStore.current = tray
  }),
}))

vi.mock('../utils/update-dialogs', () => ({
  handleCheckForUpdates: vi.fn(),
}))

describe('system-tray template builder injection', () => {
  beforeEach(async () => {
    trayStore.current = null
    mockMenu.buildFromTemplate.mockClear()
    trayMethods.setContextMenu.mockClear()
    trayMethods.isDestroyed.mockClear()
    trayMethods.isDestroyed.mockReturnValue(false)
    // Reset the module's internal state (menuTemplateBuilder) between tests.
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('uses createMenuTemplate by default when no custom builder is set', async () => {
    const systemTray = await import('../system-tray')

    systemTray.initTray({ toolHiveIsRunning: true })

    expect(mockMenu.buildFromTemplate).toHaveBeenCalledTimes(1)
    const template = mockMenu.buildFromTemplate.mock.calls[0]?.[0] as Array<{
      label?: string
    }>
    // The default template includes the "Check for Updates..." entry.
    expect(template.some((item) => item.label === 'Check for Updates...')).toBe(
      true
    )
  })

  it('routes setupTrayMenu through a custom template builder when set', async () => {
    const systemTray = await import('../system-tray')

    const customBuilder = vi.fn(() => [
      { label: 'custom-status', type: 'normal' as const, enabled: false },
      { type: 'separator' as const },
      { label: 'custom-quit', type: 'normal' as const },
    ])

    systemTray.setMenuTemplateBuilder(customBuilder)
    systemTray.initTray({ toolHiveIsRunning: true })

    expect(customBuilder).toHaveBeenCalledTimes(1)
    expect(customBuilder).toHaveBeenCalledWith(true)

    expect(mockMenu.buildFromTemplate).toHaveBeenCalledTimes(1)
    const passedTemplate = mockMenu.buildFromTemplate.mock
      .calls[0]?.[0] as Array<{
      label?: string
    }>
    expect(passedTemplate).toHaveLength(3)
    expect(passedTemplate[0]?.label).toBe('custom-status')
    expect(passedTemplate[2]?.label).toBe('custom-quit')
  })

  it('propagates toolHiveIsRunning to the custom builder on updateTrayStatus', async () => {
    const systemTray = await import('../system-tray')

    const customBuilder = vi.fn(() => [
      { label: 'placeholder', type: 'normal' as const },
    ])
    systemTray.setMenuTemplateBuilder(customBuilder)

    // initTray creates the tray and triggers a first call.
    systemTray.initTray({ toolHiveIsRunning: false })
    expect(customBuilder).toHaveBeenLastCalledWith(false)

    // updateTrayStatus should re-invoke the same custom builder with the new flag.
    systemTray.updateTrayStatus(true)
    expect(customBuilder).toHaveBeenLastCalledWith(true)
    expect(customBuilder).toHaveBeenCalledTimes(2)
  })
})
