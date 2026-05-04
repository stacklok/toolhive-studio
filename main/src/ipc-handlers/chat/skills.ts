import { ipcMain } from 'electron'
import { getEnabledSkills, setSkillEnabled } from '../../chat/settings-storage'

export function register() {
  ipcMain.handle('chat:get-enabled-skills', () => getEnabledSkills())
  ipcMain.handle(
    'chat:set-enabled-skill',
    (_, name: string, enabled: boolean) => setSkillEnabled(name, enabled)
  )
}
