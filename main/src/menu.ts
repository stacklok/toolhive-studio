import { Menu, app, type MenuItemConstructorOptions } from 'electron'
import { ChildProcess } from 'node:child_process'
import { getAutoLaunchStatus, setAutoLaunch } from './auto-launch'
import { updateTrayStatus } from './system-tray'

let tray: Electron.Tray | null = null
let toolhiveProcess: ChildProcess | null = null

export function setMenuReferences(
  trayRef: Electron.Tray | null,
  processRef: ChildProcess | null
) {
  tray = trayRef
  toolhiveProcess = processRef
}

export function createApplicationMenu() {
  const isMac = process.platform === 'darwin'

  if (!isMac) return

  const template = [
    {
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Start on Login',
          type: 'checkbox',
          checked: getAutoLaunchStatus(),
          accelerator: 'Cmd+L',
          click: () => {
            try {
              setAutoLaunch(!getAutoLaunchStatus())
              updateApplicationMenuAutoLaunch()
              if (tray) {
                updateTrayStatus(tray, !!toolhiveProcess)
              }
            } catch (error) {
              console.error('Failed to toggle auto-launch:', error)
            }
          },
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template as MenuItemConstructorOptions[])
  Menu.setApplicationMenu(menu)
}

export function updateApplicationMenuAutoLaunch() {
  createApplicationMenu()
}
