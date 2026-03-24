import Store from 'electron-store'
import log from './logger'
import { writeSetting } from './db/writers/settings-writer'
import { readSetting } from './db/readers/settings-reader'

interface ExpertConsultationStore {
  expertConsultationSubmitted: boolean
  expertConsultationDismissedAt: string
}

export interface ExpertConsultationState {
  submitted: boolean
  dismissedAt: string
}

// Kept for one-time reconciliation migration; remove after migration grace period
export const expertConsultationStore = new Store<ExpertConsultationStore>({
  name: 'expert-consultation',
  defaults: {
    expertConsultationSubmitted: false,
    expertConsultationDismissedAt: '',
  },
})

export function getExpertConsultationState(): ExpertConsultationState {
  if (process.env.TOOLHIVE_E2E === 'true') {
    return { submitted: true, dismissedAt: '' }
  }

  try {
    const submitted = readSetting('expertConsultationSubmitted')
    const dismissedAt = readSetting('expertConsultationDismissedAt')
    if (submitted !== undefined) {
      return {
        submitted: submitted === 'true',
        dismissedAt: dismissedAt ?? '',
      }
    }
  } catch (err) {
    log.error('[DB] SQLite read failed:', err)
  }
  return { submitted: false, dismissedAt: '' }
}

export function setExpertConsultationSubmitted(submitted: boolean): void {
  try {
    writeSetting('expertConsultationSubmitted', String(submitted))
  } catch (err) {
    log.error('[DB] Failed to write expertConsultationSubmitted:', err)
  }
}

export function setExpertConsultationDismissedAt(dismissedAt: string): void {
  try {
    writeSetting('expertConsultationDismissedAt', dismissedAt)
  } catch (err) {
    log.error('[DB] Failed to write expertConsultationDismissedAt:', err)
  }
}
