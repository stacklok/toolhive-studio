import { dialog } from 'electron'
import Store from 'electron-store'
import log from './logger'

interface QuitConfirmationStore {
  skipQuitConfirmation: boolean
}

const store = new Store<QuitConfirmationStore>({
  name: 'quit-confirmation',
  defaults: {
    skipQuitConfirmation: false,
  },
})

export function getSkipQuitConfirmation(): boolean {
  return store.get('skipQuitConfirmation')
}

export function setSkipQuitConfirmation(skip: boolean): void {
  store.set('skipQuitConfirmation', skip)
}

/**
 * Shows a native quit confirmation dialog with a "Don't ask me again" checkbox.
 * Returns `true` if the user confirmed the quit, `false` if cancelled.
 *
 * If the user previously opted to skip the confirmation (via the checkbox or
 * Settings), returns `true` immediately without showing the dialog.
 *
 * This uses the async `dialog.showMessageBox` (instead of the sync variant)
 * because only the async version supports `checkboxLabel` / `checkboxChecked`.
 * Callers must call `e.preventDefault()` synchronously **before** awaiting
 * this function so that the quit is held while the dialog is open.
 */
export async function showNativeQuitConfirmation(): Promise<boolean> {
  if (getSkipQuitConfirmation()) {
    log.info('[quit-confirmation] Skipping dialog (user preference)')
    return true
  }

  try {
    const { response, checkboxChecked } = await dialog.showMessageBox({
      type: 'warning',
      title: 'Quit ToolHive',
      message: 'Quit ToolHive?',
      detail: 'Shutting down ToolHive stops all MCP servers.',
      buttons: ['Quit', 'Cancel'],
      defaultId: 0,
      cancelId: 1,
      checkboxLabel: "Don't ask me again",
      checkboxChecked: false,
    })

    const confirmed = response === 0

    if (confirmed && checkboxChecked) {
      setSkipQuitConfirmation(true)
      log.info('[quit-confirmation] User opted to skip future confirmations')
    }

    log.info(
      `[quit-confirmation] User ${confirmed ? 'confirmed' : 'cancelled'} quit`
    )
    return confirmed
  } catch (error) {
    log.error(
      '[quit-confirmation] Failed to show native quit confirmation dialog',
      error
    )
    // Fail open so the app can still exit gracefully even if the dialog fails
    // (e.g. during OS shutdown edge cases).
    return true
  }
}
