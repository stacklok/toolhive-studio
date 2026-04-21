import { register as registerApp } from './app'
import { register as registerAutoUpdate } from './auto-update'
import { register as registerChat } from './chat'
import { register as registerCli } from './cli'
import { register as registerDarkMode } from './dark-mode'
import { register as registerDialogs } from './dialogs'
import { register as registerFeatureFlags } from './feature-flags'
import { register as registerTelemetry } from './telemetry'
import { register as registerToolhive } from './toolhive'
import { register as registerUiPreferences } from './ui-preferences'
import { register as registerUtils } from './utils'
import { register as registerWindow } from './window'

export function registerAllHandlers() {
  registerApp()
  registerDarkMode()
  registerWindow()
  registerToolhive()
  registerTelemetry()
  registerAutoUpdate()
  registerDialogs()
  registerFeatureFlags()
  registerChat()
  registerCli()
  registerUiPreferences()
  registerUtils()
}
