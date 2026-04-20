import { ipcMain } from 'electron'
import {
  getViewModePreference,
  setViewModePreference,
  UI_PREFERENCE_KEYS,
  type UiPreferenceKey,
  type ViewMode,
} from '../ui-preferences'

const DEFAULT_VIEW_MODE: ViewMode = 'card'

function isUiPreferenceKey(key: unknown): key is UiPreferenceKey {
  return (
    typeof key === 'string' &&
    (UI_PREFERENCE_KEYS as readonly string[]).includes(key)
  )
}

function isViewMode(value: unknown): value is ViewMode {
  return value === 'card' || value === 'table'
}

export function register() {
  ipcMain.handle(
    'ui-preferences:get-view-mode',
    (_event, key: unknown): ViewMode =>
      isUiPreferenceKey(key) ? getViewModePreference(key) : DEFAULT_VIEW_MODE
  )

  ipcMain.handle(
    'ui-preferences:set-view-mode',
    (_event, key: unknown, value: unknown): void => {
      if (!isUiPreferenceKey(key) || !isViewMode(value)) return
      setViewModePreference(key, value)
    }
  )
}
