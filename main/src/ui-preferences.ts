import log from './logger'
import { readSetting } from './db/readers/settings-reader'
import { writeSetting } from './db/writers/settings-writer'

export const UI_PREFERENCE_KEYS = [
  'ui.viewMode.mcpServers',
  'ui.viewMode.skillsInstalled',
] as const

export type UiPreferenceKey = (typeof UI_PREFERENCE_KEYS)[number]

export type ViewMode = 'card' | 'table'

const DEFAULT_VIEW_MODE: ViewMode = 'card'

function isValidKey(key: string): key is UiPreferenceKey {
  return (UI_PREFERENCE_KEYS as readonly string[]).includes(key)
}

function isValidViewMode(value: string): value is ViewMode {
  return value === 'card' || value === 'table'
}

export function getViewModePreference(key: UiPreferenceKey): ViewMode {
  try {
    const raw = readSetting(key)
    if (raw && isValidViewMode(raw)) {
      return raw
    }
  } catch (err) {
    log.error(`[DB] Failed to read UI preference "${key}":`, err)
  }
  return DEFAULT_VIEW_MODE
}

export function setViewModePreference(
  key: UiPreferenceKey,
  value: ViewMode
): void {
  if (!isValidKey(key)) {
    log.warn(`[DB] Refusing to write unknown UI preference key: ${key}`)
    return
  }
  if (!isValidViewMode(value)) {
    log.warn(`[DB] Refusing to write invalid view mode: ${value}`)
    return
  }
  try {
    writeSetting(key, value)
  } catch (err) {
    log.error(`[DB] Failed to write UI preference "${key}":`, err)
  }
}
