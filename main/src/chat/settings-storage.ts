import { Effect } from 'effect'
import { runChatSyncOr, runChatPromiseOr, runChatToResultSync } from './runtime'
import { SettingsService } from './settings/settings-service'
import type {
  ChatSettingsProvider,
  ChatSettingsSelectedModel,
} from './settings/settings-service'
import {
  CHAT_PROVIDER_INFO,
  LOCAL_PROVIDER_IDS,
  type LocalProviderId,
} from './constants'

type ProviderId = (typeof CHAT_PROVIDER_INFO)[number]['id']

function isLocalProvider(
  providerId: ProviderId
): providerId is LocalProviderId {
  return LOCAL_PROVIDER_IDS.includes(providerId as LocalProviderId)
}

function defaultChatSettings(providerId: ProviderId): ChatSettingsProvider {
  if (isLocalProvider(providerId)) {
    return { providerId, endpointURL: '', enabledTools: [] }
  }
  return {
    providerId,
    apiKey: '',
    enabledTools: [],
  }
}

const EMPTY_SELECTED_MODEL: ChatSettingsSelectedModel = {
  provider: '',
  model: '',
}

export function getChatSettings(providerId: ProviderId): ChatSettingsProvider {
  return runChatSyncOr(
    SettingsService.getChatSettings(providerId),
    defaultChatSettings(providerId)
  )
}

export function clearChatSettings(providerId?: ProviderId): {
  success: boolean
  error?: string
} {
  return runChatToResultSync(
    SettingsService.clearChatSettings(providerId).pipe(Effect.as({}))
  )
}

export function getSelectedModel(): ChatSettingsSelectedModel {
  return runChatSyncOr(SettingsService.getSelectedModel(), EMPTY_SELECTED_MODEL)
}

export function saveSelectedModel(
  provider: string,
  model: string
): { success: boolean; error?: string } {
  return runChatToResultSync(
    SettingsService.saveSelectedModel(provider, model).pipe(Effect.as({}))
  )
}

export function saveEnabledMcpTools(
  serverName: string,
  toolNames: string[]
): { success: boolean; error?: string } {
  return runChatToResultSync(
    SettingsService.saveEnabledMcpTools(serverName, toolNames).pipe(
      Effect.as({})
    )
  )
}

export async function getEnabledMcpTools(): Promise<Record<string, string[]>> {
  return runChatPromiseOr(SettingsService.getEnabledMcpTools(), {})
}

export async function getEnabledMcpServersFromTools(): Promise<string[]> {
  return runChatPromiseOr(SettingsService.getEnabledMcpServersFromTools(), [])
}

export function getEnabledSkills(): string[] {
  return runChatSyncOr(SettingsService.getEnabledSkills(), [])
}

export function setSkillEnabled(
  name: string,
  enabled: boolean
): { success: boolean; error?: string } {
  return runChatToResultSync(
    SettingsService.setSkillEnabled(name, enabled).pipe(Effect.as({}))
  )
}

export function pruneEnabledSkillsTo(
  installedNames: readonly string[]
): number {
  return runChatSyncOr(SettingsService.pruneEnabledSkillsTo(installedNames), 0)
}

export function handleSaveSettings(
  providerId: string,
  settings:
    | { apiKey: string; enabledTools: string[] }
    | { endpointURL: string; enabledTools: string[] }
): { success: boolean; error?: string } {
  return runChatToResultSync(
    SettingsService.handleSaveSettings(providerId, settings).pipe(Effect.as({}))
  )
}
