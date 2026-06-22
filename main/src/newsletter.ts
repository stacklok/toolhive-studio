import Store from 'electron-store'
import log from './logger'
import { isDbWritable } from './db/database'
import { writeSetting } from './db/writers/settings-writer'
import { readSetting } from './db/readers/settings-reader'

interface NewsletterStore {
  newsletterSubscribed: boolean
  newsletterDismissedAt: string
}

interface NewsletterState {
  subscribed: boolean
  dismissedAt: string
}

// Kept for one-time reconciliation migration; remove after migration grace period
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
    log.error('[DB] SQLite read failed:', err)
  }
  return { subscribed: false, dismissedAt: '' }
}

export function setNewsletterSubscribed(subscribed: boolean): void {
  try {
    writeSetting('newsletterSubscribed', String(subscribed))
  } catch (err) {
    log.error('[DB] Failed to write newsletterSubscribed:', err)
  }
}

// Returns whether the dismissal was actually persisted. `false` means the
// write was skipped (read-only DB — Bucket A) or threw (Bucket B); the renderer
// uses this to suppress the modal for the session so it doesn't loop.
export function setNewsletterDismissedAt(dismissedAt: string): boolean {
  if (!isDbWritable()) return false
  try {
    writeSetting('newsletterDismissedAt', dismissedAt)
    return true
  } catch (err) {
    log.error('[DB] Failed to write newsletterDismissedAt:', err)
    return false
  }
}
