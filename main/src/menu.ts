import { Menu, app } from 'electron'
import { getAutoLaunchStatus, setAutoLaunch } from './auto-launch'
import { updateTrayStatus } from './system-tray'
import { handleCheckForUpdates } from './utils/update-dialogs'
import log from './logger'

function createAutoLaunchItem(accelerator: string) {
  return {
    label: 'Start on Login',
    type: 'checkbox' as const,
    checked: getAutoLaunchStatus(),
    accelerator,
    click: () => {
      try {
        const currentStatus = getAutoLaunchStatus()
        setAutoLaunch(!currentStatus)
        updateTrayStatus(true)
        createApplicationMenu()
      } catch (error) {
        log.error('Failed to toggle auto-launch: ', error)
      }
    },
  }
}

export function createApplicationMenu() {
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
  const isProduction = app.isPackaged
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.getName(),
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        {
          label: 'Check for Updates...',
          visible: isProduction,
          click: async () => {
            await handleCheckForUpdates()
          },
        },
        { type: 'separator' as const },
        createAutoLaunchItem(isMac ? 'Cmd+L' : 'Ctrl+L'),
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
      ],
    },
    ...restMenuItems,
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
