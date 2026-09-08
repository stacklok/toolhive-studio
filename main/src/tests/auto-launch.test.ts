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

afterEach(() => {
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
    vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin')

    setAutoLaunch(true)

    expect(setLoginItemSettings).toHaveBeenCalledWith({
      openAtLogin: true,
    })
  })

  it('uses the hidden launch argument on Windows', () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('win32')

    setAutoLaunch(true)

    expect(setLoginItemSettings).toHaveBeenCalledWith({
      openAtLogin: true,
      path: process.execPath,
      args: ['--hidden'],
    })
  })
})
