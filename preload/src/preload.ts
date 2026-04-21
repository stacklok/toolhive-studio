// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge } from 'electron'
import { appApi, type AppAPI } from './api/app'
import { autoUpdateApi, type AutoUpdateAPI } from './api/auto-update'
import { chatApi, type ChatAPI } from './api/chat'
import { cliApi, type CliAPI } from './api/cli'
import { darkModeApi, type DarkModeAPI } from './api/dark-mode'
import { dialogsApi, type DialogsAPI } from './api/dialogs'
import { eventsApi, type EventsAPI } from './api/events'
import { featureFlagsApi, type FeatureFlagsAPI } from './api/feature-flags'
import { telemetryApi, type TelemetryAPI } from './api/telemetry'
import { toolhiveApi, type ToolhiveAPI } from './api/toolhive'
import { uiPreferencesApi, type UiPreferencesAPI } from './api/ui-preferences'
import { utilsApi, type UtilsAPI } from './api/utils'
import { windowApi, type WindowAPI } from './api/window'

export type ElectronAPI = AppAPI &
  DarkModeAPI &
  WindowAPI &
  ToolhiveAPI &
  TelemetryAPI &
  AutoUpdateAPI &
  DialogsAPI &
  FeatureFlagsAPI &
  ChatAPI &
  CliAPI &
  UiPreferencesAPI &
  UtilsAPI &
  EventsAPI

const electronAPI = {
  ...appApi,
  ...darkModeApi,
  ...windowApi,
  ...toolhiveApi,
  ...telemetryApi,
  ...autoUpdateApi,
  ...dialogsApi,
  ...featureFlagsApi,
  ...chatApi,
  ...cliApi,
  ...uiPreferencesApi,
  ...utilsApi,
  ...eventsApi,
} satisfies ElectronAPI

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
