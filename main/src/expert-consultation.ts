import Store from 'electron-store'
import log from './logger'
import { writeSetting } from './db/writers/settings-writer'
import { readSetting } from './db/readers/settings-reader'
import { getFeatureFlag } from './feature-flags/flags'
import { featureFlagKeys } from '../../utils/feature-flags'

interface ExpertConsultationStore {
  expertConsultationSubmitted: boolean
  expertConsultationDismissedAt: string
}

export interface ExpertConsultationState {
  submitted: boolean
  dismissedAt: string
}

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

  if (getFeatureFlag(featureFlagKeys.SQLITE_READS_SETTINGS)) {
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
      log.error('[DB] SQLite read failed, falling back to electron-store:', err)
    }
  }
  return {
    submitted: expertConsultationStore.get('expertConsultationSubmitted'),
    dismissedAt: expertConsultationStore.get('expertConsultationDismissedAt'),
  }
}

export function setExpertConsultationSubmitted(submitted: boolean): void {
  expertConsultationStore.set('expertConsultationSubmitted', submitted)
  try {
    writeSetting('expertConsultationSubmitted', String(submitted))
  } catch (err) {
    log.error('[DB] Failed to dual-write expertConsultationSubmitted:', err)
  }
}

export function setExpertConsultationDismissedAt(dismissedAt: string): void {
  expertConsultationStore.set('expertConsultationDismissedAt', dismissedAt)
  try {
    writeSetting('expertConsultationDismissedAt', dismissedAt)
  } catch (err) {
    log.error('[DB] Failed to dual-write expertConsultationDismissedAt:', err)
  }
}
