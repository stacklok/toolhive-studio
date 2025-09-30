import * as Sentry from '@sentry/electron/renderer'

export function trackEvent(eventName: string, data = {}) {
  Sentry.startSpan(
    {
      name: eventName,
      op: 'user.event',
      attributes: {
        'analytics.source': 'tracking',
        'analytics.type': 'event',
        'screen.width': window.innerWidth,
        'screen.height': window.innerHeight,
        'screen.aspect_ratio': (window.innerWidth / window.innerHeight).toFixed(
          2
        ),
        ...data,
        timestamp: new Date().toISOString(),
      },
    },
    () => {}
  )
}

export function trackPageView(pageName: string, data = {}) {
  Sentry.startSpan(
    {
      name: `Page: ${pageName}`,
      op: 'page_view',
      attributes: {
        'analytics.source': 'tracking',
        'analytics.type': 'page_view',
        'page.name': pageName,
        'action.type': 'navigation',
        'screen.width': window.innerWidth,
        'screen.height': window.innerHeight,
        'screen.aspect_ratio': (window.innerWidth / window.innerHeight).toFixed(
          2
        ),
        ...data,
        timestamp: new Date().toISOString(),
      },
    },
    () => {}
  )
}
