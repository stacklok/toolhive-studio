import { app } from 'electron'
import path from 'node:path'
import log from './logger'
import {
  showMainWindow,
  getMainWindow,
  sendToMainWindowRenderer,
} from './main-window'

export interface DeepLinkData {
  action: string
  serverName?: string
  registryName?: string
}

/**
 * Register the custom protocol for deep linking
 */
export function registerProtocol(): void {
  // Set as default protocol client for toolhive:// URLs
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('toolhive', process.execPath, [
        path.resolve(process.argv[1]!),
      ])
    }
  } else {
    app.setAsDefaultProtocolClient('toolhive')
  }

  log.info('Registered toolhive:// protocol handler')
}

/**
 * Parse a toolhive:// URL into structured data
 */
export function parseDeepLink(url: string): DeepLinkData | null {
  try {
    const parsedUrl = new URL(url)

    if (parsedUrl.protocol !== 'toolhive:') {
      log.warn(`Invalid protocol for deep link: ${parsedUrl.protocol}`)
      return null
    }

    const action = parsedUrl.hostname || parsedUrl.pathname.replace(/^\/+/, '')
    const searchParams = parsedUrl.searchParams

    const data: DeepLinkData = { action }

    // Extract common parameters
    if (searchParams.has('server')) {
      data.serverName = searchParams.get('server')!
    }

    if (searchParams.has('registry')) {
      data.registryName = searchParams.get('registry')!
    }

    log.info(`Parsed deep link: ${JSON.stringify(data)}`)
    return data
  } catch (error) {
    log.error(`Failed to parse deep link URL: ${url}`, error)
    return null
  }
}

/**
 * Handle a deep link by navigating to the appropriate page
 */
export async function handleDeepLink(url: string): Promise<void> {
  log.info(`Handling deep link: ${url}`)

  const linkData = parseDeepLink(url)
  if (!linkData) {
    log.error(`Failed to parse deep link: ${url}`)
    return
  }

  try {
    // Ensure the main window is visible
    await showMainWindow()

    // Wait a bit for the window to be ready
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Send the deep link data to the renderer process
    const mainWindow = getMainWindow()
    if (mainWindow && mainWindow.webContents) {
      sendToMainWindowRenderer('deep-link-navigate', linkData)
      log.info(`Sent deep link data to renderer: ${JSON.stringify(linkData)}`)
    } else {
      log.error('Main window not available for deep link navigation')
    }
  } catch (error) {
    log.error('Failed to handle deep link:', error)
  }
}

/**
 * Generate a deep link URL for installing a server
 */
export function generateInstallServerLink(
  serverName: string,
  registryName?: string
): string {
  const url = new URL('toolhive://install-server')

  url.searchParams.set('server', serverName)

  if (registryName) {
    url.searchParams.set('registry', registryName)
  }

  return url.toString()
}

/**
 * Generate CLI command for users who prefer command line
 */
export function generateCliCommand(
  serverName: string,
  registryName?: string
): string {
  let command = `thv run`

  if (registryName) {
    command += ` --registry ${registryName}`
  }

  command += ` ${serverName}`

  return command
}
