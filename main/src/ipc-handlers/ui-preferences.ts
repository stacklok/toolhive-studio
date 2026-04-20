import { ipcMain } from 'electron'
import {
  getViewModePreference,
  setViewModePreference,
  type UiPreferenceKey,
  type ViewMode,
} from '../ui-preferences'

export function register() {
  ipcMain.handle(
    'ui-preferences:get-view-mode',
    (_event, key: UiPreferenceKey): ViewMode => getViewModePreference(key)
  )

  ipcMain.handle(
    'ui-preferences:set-view-mode',
    (_event, key: UiPreferenceKey, value: ViewMode): void => {
      setViewModePreference(key, value)
    }
  )
}
