import { Effect } from 'effect'
import { runChatSync, runChatPromise, runChatToResultSync } from './runtime'
import { SettingsService } from './settings/settings-service'
import type {
  ChatSettingsProvider,
  ChatSettingsSelectedModel,
} from './settings/settings-service'
import { getLegacyChatSettingsStore } from './settings/legacy-store-access'
import { CHAT_PROVIDER_INFO } from './constants'

type ProviderId = (typeof CHAT_PROVIDER_INFO)[number]['id']

// Kept for one-time reconciliation migration; remove after migration grace period
export const chatSettingsStore = getLegacyChatSettingsStore()

export function getChatSettings(providerId: ProviderId): ChatSettingsProvider {
  return runChatSync(SettingsService.getChatSettings(providerId))
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
  return runChatSync(SettingsService.getSelectedModel())
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
  return runChatPromise(SettingsService.getEnabledMcpTools())
}

export async function getEnabledMcpServersFromTools(): Promise<string[]> {
  return runChatPromise(SettingsService.getEnabledMcpServersFromTools())
}

export function getEnabledSkills(): string[] {
  return runChatSync(SettingsService.getEnabledSkills())
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
  return runChatSync(SettingsService.pruneEnabledSkillsTo(installedNames))
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

export async function reconcileEnabledMcpTools(): Promise<void> {
  await runChatPromise(SettingsService.reconcileEnabledMcpTools())
}
