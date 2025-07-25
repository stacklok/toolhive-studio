import { Menu, app, BrowserWindow } from 'electron'
import { getAutoLaunchStatus, setAutoLaunch } from './auto-launch'
import { updateTrayStatus } from './system-tray'
import log from './logger'

function createAutoLaunchItem(
  accelerator: string,
  trayRef: Electron.Tray | null
) {
  return {
    label: 'Start on Login',
    type: 'checkbox' as const,
    checked: getAutoLaunchStatus(),
    accelerator,
    click: () => {
      try {
        const currentStatus = getAutoLaunchStatus()
        setAutoLaunch(!currentStatus)
        if (trayRef) {
          updateTrayStatus(trayRef, true)
        }
        createApplicationMenu(trayRef)
      } catch (error) {
        log.error('Failed to toggle auto-launch: ', error)
      }
    },
  }
}

function createHideWindowItem() {
  return {
    label: 'Hide Window',
    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
    click: () => {
      // Hide window instead of quitting when using Ctrl+Q
      log.info('Hide window triggered via keyboard shortcut')
      const window = BrowserWindow.getAllWindows()[0]
      if (window) {
        window.hide()
      }
    },
  }
}

export function createApplicationMenu(trayRef: Electron.Tray | null) {
  const isMac = process.platform === 'darwin'
  const defaultMenu = Menu.getApplicationMenu()?.items ?? []

  const convertMenuItemsToTemplate = (
    items: Electron.MenuItem[]
  ): Electron.MenuItemConstructorOptions[] => {
    return items.map((item) => ({
      label: item.label,
      type: item.type,
      role: item.role,
      enabled: item.enabled,
      visible: item.visible,
      checked: item.checked,
      accelerator: item.accelerator,
      submenu:
        item.submenu && 'items' in item.submenu
          ? convertMenuItemsToTemplate(item.submenu.items)
          : undefined,
    }))
  }

  const existingMenus = convertMenuItemsToTemplate(defaultMenu)
  const restMenuItems = existingMenus.slice(1)
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.getName(),
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        createAutoLaunchItem(isMac ? 'Cmd+L' : 'Ctrl+L', trayRef),
        { type: 'separator' as const },
        ...(isMac
          ? [
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
            ]
          : []),
        createHideWindowItem(),
      ],
    },
    ...restMenuItems,
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
