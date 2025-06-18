// hooks/useAnalytics.js
import { useCallback } from 'react'
import * as Sentry from '@sentry/electron/renderer'

export const useAnalytics = () => {
  // Traccia eventi usando spans (appariranno in Performance, non in Issues)
  const trackEvent = useCallback((eventName: string, data = {}) => {
    Sentry.startSpan(
      {
        name: eventName,
        op: 'user.action',
        attributes: {
          ...data,
          timestamp: new Date().toISOString(),
          component: 'react',
        },
      },
      () => {
        // Span vuoto che si chiude immediatamente
        // Questo apparirà nella sezione Performance
      }
    )
  }, [])

  // Traccia click sui bottoni in modo specifico
  const trackButtonClick = useCallback((buttonId: string, extraData = {}) => {
    // Traccia in Sentry (Performance)
    Sentry.startSpan(
      {
        name: `Button: ${buttonId}`,
        op: 'user.click',
        attributes: {
          'button.id': buttonId,
          'ui.action': 'click',
          'component.type': 'button',
          ...extraData,
          timestamp: new Date().toISOString(),
        },
      },
      () => {
        // Span che traccia il click
      }
    )

    // I traces saranno automaticamente inviati a Jaeger
    // tramite il beforeSendTransaction hook in renderer.tsx
  }, [])

  // Traccia operazioni più complesse con spans (versione moderna)
  const trackOperation = useCallback(
    (name: string, operation: () => Promise<void> | void) => {
      return Sentry.startSpan({ name, op: 'user_interaction' }, () => {
        try {
          const result = operation()

          if (result instanceof Promise) {
            return result.catch((error) => {
              Sentry.captureException(error)
              throw error
            })
          }

          return result
        } catch (error) {
          Sentry.captureException(error)
          throw error
        }
      })
    },
    []
  )

  // Traccia form submission
  const trackFormSubmission = useCallback((formName: string, data = {}) => {
    Sentry.captureMessage(`Form submitted: ${formName}`, {
      level: 'info',
      tags: {
        ui_action: 'form_submit',
        form_name: formName,
        component_type: 'form',
      },
      extra: {
        ...data,
        timestamp: new Date().toISOString(),
        action_type: 'submit',
      },
    })
  }, [])

  // Traccia navigazione tra pagine/sezioni
  const trackPageView = useCallback((pageName: string, data = {}) => {
    Sentry.captureMessage(`Page viewed: ${pageName}`, {
      level: 'info',
      tags: {
        ui_action: 'page_view',
        page_name: pageName,
      },
      extra: {
        ...data,
        timestamp: new Date().toISOString(),
        action_type: 'navigation',
      },
    })
  }, [])

  return {
    trackEvent,
    trackButtonClick,
    trackOperation,
    trackFormSubmission,
    trackPageView,
  }
}
