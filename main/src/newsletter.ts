import Store from 'electron-store'
import log from './logger'
import { writeSetting } from './db/writers/settings-writer'
import { readSetting } from './db/readers/settings-reader'
import { getFeatureFlag } from './feature-flags/flags'
import { featureFlagKeys } from '../../utils/feature-flags'

interface NewsletterStore {
  newsletterSubscribed: boolean
  newsletterDismissedAt: string
}

export interface NewsletterState {
  subscribed: boolean
  dismissedAt: string
}

export const newsletterStore = new Store<NewsletterStore>({
  name: 'newsletter',
  defaults: {
    newsletterSubscribed: false,
    newsletterDismissedAt: '',
  },
})

export function getNewsletterState(): NewsletterState {
  if (process.env.TOOLHIVE_E2E === 'true') {
    return { subscribed: true, dismissedAt: '' }
  }

  if (getFeatureFlag(featureFlagKeys.SQLITE_READS_SETTINGS)) {
    try {
      const subscribed = readSetting('newsletterSubscribed')
      const dismissedAt = readSetting('newsletterDismissedAt')
      if (subscribed !== undefined) {
        return {
          subscribed: subscribed === 'true',
          dismissedAt: dismissedAt ?? '',
        }
      }
    } catch (err) {
      log.error('[DB] SQLite read failed, falling back to electron-store:', err)
    }
  }
  return {
    subscribed: newsletterStore.get('newsletterSubscribed'),
    dismissedAt: newsletterStore.get('newsletterDismissedAt'),
  }
}

export function setNewsletterSubscribed(subscribed: boolean): void {
  newsletterStore.set('newsletterSubscribed', subscribed)
  try {
    writeSetting('newsletterSubscribed', String(subscribed))
  } catch (err) {
    log.error('[DB] Failed to dual-write newsletterSubscribed:', err)
  }
}

export function setNewsletterDismissedAt(dismissedAt: string): void {
  newsletterStore.set('newsletterDismissedAt', dismissedAt)
  try {
    writeSetting('newsletterDismissedAt', dismissedAt)
  } catch (err) {
    log.error('[DB] Failed to dual-write newsletterDismissedAt:', err)
  }
}
