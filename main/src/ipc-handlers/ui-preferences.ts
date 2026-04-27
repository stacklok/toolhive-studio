import { ipcMain } from 'electron'
import {
  getPageSizePreference,
  getViewModePreference,
  isValidPageSize,
  setPageSizePreference,
  setViewModePreference,
  UI_PAGE_SIZE_PREFERENCE_KEYS,
  UI_PREFERENCE_KEYS,
  type UiPageSizeKey,
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

function isUiPageSizeKey(key: unknown): key is UiPageSizeKey {
  return (
    typeof key === 'string' &&
    (UI_PAGE_SIZE_PREFERENCE_KEYS as readonly string[]).includes(key)
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

  ipcMain.handle(
    'ui-preferences:get-page-size',
    (_event, key: unknown): number | undefined =>
      isUiPageSizeKey(key) ? getPageSizePreference(key) : undefined
  )

  ipcMain.handle(
    'ui-preferences:set-page-size',
    (_event, key: unknown, value: unknown): void => {
      if (!isUiPageSizeKey(key) || !isValidPageSize(value)) return
      setPageSizePreference(key, value)
    }
  )
}
