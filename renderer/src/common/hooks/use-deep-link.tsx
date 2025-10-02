import { useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import log from 'electron-log/renderer'

export interface DeepLinkData {
  action: string
  serverName?: string
  registryName?: string
}

/**
 * Hook to handle deep link navigation
 */
export function useDeepLink() {
  const router = useRouter()

  useEffect(() => {
    if (!window.electronAPI?.deepLink) {
      return
    }

    const unsubscribe = window.electronAPI.deepLink.onNavigate(
      (data: unknown) => {
        const linkData = data as DeepLinkData
        log.info('Received deep link navigation:', linkData)

        handleDeepLinkNavigation(linkData, router)
      }
    )

    return unsubscribe
  }, [router])

  return {
    generateInstallLink: window.electronAPI?.deepLink?.generateInstallLink,
    generateCliCommand: window.electronAPI?.deepLink?.generateCliCommand,
  }
}

/**
 * Handle deep link navigation based on the action
 */
function handleDeepLinkNavigation(
  data: DeepLinkData,
  router: ReturnType<typeof useRouter>
) {
  try {
    switch (data.action) {
      case 'install-server':
        handleInstallServerLink(data, router)
        break

      default:
        log.warn(`Unknown deep link action: ${data.action}`)
        // Navigate to default page
        router.navigate({
          to: '/group/$groupName',
          params: { groupName: 'default' },
        })
    }
  } catch (error) {
    log.error('Failed to handle deep link navigation:', error)
    // Fallback to default page
    router.navigate({
      to: '/group/$groupName',
      params: { groupName: 'default' },
    })
  }
}

/**
 * Handle install-server deep link
 */
function handleInstallServerLink(
  data: DeepLinkData,
  router: ReturnType<typeof useRouter>
) {
  if (!data.serverName) {
    log.error('Missing server name for install-server deep link')
    return
  }

  // Navigate to registry server detail page with server name as the route param
  router.navigate({
    to: '/registry/$name',
    params: { name: data.serverName },
    search: {
      // Pass server name explicitly in search to trigger modal opening
      server: data.serverName,
    },
  })

  log.info(`Navigated to install server: ${data.serverName}`)
}
