import { app } from 'electron'
import path from 'node:path'
import { existsSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import log from './logger'

interface DesktopEntry {
  Type: string
  Name: string
  Exec: string
  Hidden: string
  NoDisplay: string
  'X-GNOME-Autostart-enabled': string
  Comment: string
}

export function createDesktopEntry(execPath: string): string {
  const entry: DesktopEntry = {
    Type: 'Application',
    Name: 'ToolHive Studio',
    Exec: `"${execPath}" --hidden`,
    Hidden: 'false',
    NoDisplay: 'false',
    'X-GNOME-Autostart-enabled': 'true',
    Comment: 'ToolHive Studio Auto-Launch',
  }

  return Object.entries(entry)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
    .concat('\n')
}

export function setAutoLaunch(enabled: boolean) {
  if (process.platform === 'darwin') {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true,
    })
  }

  if (process.platform === 'win32') {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true,
      path: process.execPath,
      args: ['--hidden'],
    })
  }

  if (process.platform === 'linux') {
    const desktopPath = path.join(homedir(), '.config', 'autostart')
    const desktopFile = path.join(desktopPath, 'toolhive-studio.desktop')

    if (enabled) {
      if (!existsSync(desktopPath)) {
        mkdirSync(desktopPath, { recursive: true })
      }

      try {
        const desktopEntry = `[Desktop Entry]\n${createDesktopEntry(process.execPath)}`
        writeFileSync(desktopFile, desktopEntry)
        log.info(`Created autostart file: ${desktopFile}`)
      } catch (error) {
        log.error('Failed to create autostart file: ', error)
      }
    } else {
      try {
        if (existsSync(desktopFile)) {
          unlinkSync(desktopFile)
          log.info(`Removed autostart file: ${desktopFile}`)
        }
      } catch (error) {
        log.error('Failed to remove autostart file: ', error)
      }
    }
  }
}

export function getAutoLaunchStatus(): boolean {
  if (process.platform === 'linux') {
    const desktopFile = path.join(
      homedir(),
      '.config',
      'autostart',
      'toolhive-studio.desktop'
    )
    return existsSync(desktopFile)
  }

  const settings = app.getLoginItemSettings()
  return settings.openAtLogin
}
