import { ipcRenderer } from 'electron'
import type {
  UiPageSizeKey,
  UiPreferenceKey,
  ViewMode,
} from '../../../main/src/ui-preferences'

export const uiPreferencesApi = {
  uiPreferences: {
    getViewMode: (key: UiPreferenceKey): Promise<ViewMode> =>
      ipcRenderer.invoke('ui-preferences:get-view-mode', key),
    setViewMode: (key: UiPreferenceKey, value: ViewMode): Promise<void> =>
      ipcRenderer.invoke('ui-preferences:set-view-mode', key, value),
    getPageSize: (key: UiPageSizeKey): Promise<number | undefined> =>
      ipcRenderer.invoke('ui-preferences:get-page-size', key),
    setPageSize: (key: UiPageSizeKey, value: number): Promise<void> =>
      ipcRenderer.invoke('ui-preferences:set-page-size', key, value),
  },
}

export interface UiPreferencesAPI {
  uiPreferences: {
    getViewMode: (key: UiPreferenceKey) => Promise<ViewMode>
    setViewMode: (key: UiPreferenceKey, value: ViewMode) => Promise<void>
    getPageSize: (key: UiPageSizeKey) => Promise<number | undefined>
    setPageSize: (key: UiPageSizeKey, value: number) => Promise<void>
  }
}
