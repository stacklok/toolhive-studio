import { ipcMain } from 'electron'
import {
  getEnabledSkills,
  pruneEnabledSkillsTo,
  setSkillEnabled,
} from '../../chat/settings-storage'

export function register() {
  // When the renderer has just refreshed the installed-skills query, it can
  // pass the resulting names so we prune stale `enabled_skills` rows in the
  // same round-trip. Calling without an argument is a plain read.
  ipcMain.handle(
    'chat:get-enabled-skills',
    (_, installedNames?: readonly string[]) => {
      if (Array.isArray(installedNames)) {
        pruneEnabledSkillsTo(installedNames)
      }
      return getEnabledSkills()
    }
  )
  ipcMain.handle(
    'chat:set-enabled-skill',
    (_, name: string, enabled: boolean) => setSkillEnabled(name, enabled)
  )
}
