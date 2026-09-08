import { afterEach, describe, it, expect, vi } from 'vitest'
import { createDesktopEntry, setAutoLaunch } from '../auto-launch'

const setLoginItemSettings = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getName: vi.fn(() => 'ToolHive'),
    setLoginItemSettings,
  },
}))

const originalPlatform = process.platform

afterEach(() => {
  Object.defineProperty(process, 'platform', {
    value: originalPlatform,
    configurable: true,
  })
  vi.restoreAllMocks()
  setLoginItemSettings.mockClear()
})

describe('Linux desktop-entry generation', () => {
  it('quotes the Exec path when it contains spaces', () => {
    // context: https://stacklok.slack.com/archives/C072SGY78TS/p1750688399690469?thread_ts=1750674636.806059&cid=C072SGY78TS
    const execPath = '/home/alice/My Apps/Tool Hive/ToolHive'

    const entry = createDesktopEntry(execPath)

    expect(entry).toContain(
      `Exec="/home/alice/My Apps/Tool Hive/ToolHive" --hidden`
    )
  })
})

describe('login item settings', () => {
  it('enables auto-launch on macOS without removed hidden settings', () => {
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      configurable: true,
    })

    setAutoLaunch(true)

    expect(setLoginItemSettings).toHaveBeenCalledWith({
      openAtLogin: true,
    })
  })

  it('uses the hidden launch argument on Windows', () => {
    Object.defineProperty(process, 'platform', {
      value: 'win32',
      configurable: true,
    })

    setAutoLaunch(true)

    expect(setLoginItemSettings).toHaveBeenCalledWith({
      openAtLogin: true,
      path: process.execPath,
      args: ['--hidden'],
    })
  })
})
