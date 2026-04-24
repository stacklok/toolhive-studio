import log from './logger'
import { readSetting } from './db/readers/settings-reader'
import { writeSetting } from './db/writers/settings-writer'

export const UI_PREFERENCE_KEYS = [
  'ui.viewMode.mcpServers',
  'ui.viewMode.skillsInstalled',
  'ui.viewMode.registry',
  'ui.viewMode.skillsRegistry',
  'ui.viewMode.skillsBuilds',
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

export const UI_PAGE_SIZE_PREFERENCE_KEYS = [
  'ui.pageSize.skillsRegistry',
] as const

export type UiPageSizeKey = (typeof UI_PAGE_SIZE_PREFERENCE_KEYS)[number]

function isValidPageSizeKey(key: string): key is UiPageSizeKey {
  return (UI_PAGE_SIZE_PREFERENCE_KEYS as readonly string[]).includes(key)
}

function isValidPageSize(value: number): boolean {
  return Number.isInteger(value) && value > 0 && value <= 1000
}

/**
 * Reads a persisted page-size preference. Returns `undefined` when no
 * preference has been stored yet or when the persisted value is malformed,
 * so callers can fall back to a hardcoded default or URL param.
 */
export function getPageSizePreference(key: UiPageSizeKey): number | undefined {
  try {
    const raw = readSetting(key)
    if (!raw) return undefined
    const parsed = Number(raw)
    if (!isValidPageSize(parsed)) return undefined
    return parsed
  } catch (err) {
    log.error(`[DB] Failed to read page size preference "${key}":`, err)
    return undefined
  }
}

export function setPageSizePreference(key: UiPageSizeKey, value: number): void {
  if (!isValidPageSizeKey(key)) {
    log.warn(`[DB] Refusing to write unknown page size key: ${key}`)
    return
  }
  if (!isValidPageSize(value)) {
    log.warn(`[DB] Refusing to write invalid page size: ${value}`)
    return
  }
  try {
    writeSetting(key, String(value))
  } catch (err) {
    log.error(`[DB] Failed to write page size preference "${key}":`, err)
  }
}
