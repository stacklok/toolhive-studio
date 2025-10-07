import { describe, it, expect, vi } from 'vitest'
import { createDesktopEntry } from '../auto-launch'

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
  },
}))

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
