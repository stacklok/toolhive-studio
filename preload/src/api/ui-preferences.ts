import { ipcRenderer } from 'electron'
import type {
  UiPreferenceKey,
  ViewMode,
} from '../../../main/src/ui-preferences'

export const uiPreferencesApi = {
  uiPreferences: {
    getViewMode: (key: UiPreferenceKey): Promise<ViewMode> =>
      ipcRenderer.invoke('ui-preferences:get-view-mode', key),
    setViewMode: (key: UiPreferenceKey, value: ViewMode): Promise<void> =>
      ipcRenderer.invoke('ui-preferences:set-view-mode', key, value),
  },
}

export interface UiPreferencesAPI {
  uiPreferences: {
    getViewMode: (key: UiPreferenceKey) => Promise<ViewMode>
    setViewMode: (key: UiPreferenceKey, value: ViewMode) => Promise<void>
  }
}
