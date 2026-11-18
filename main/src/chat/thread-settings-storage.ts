import { Effect } from 'effect'
import { runChatSyncOr, runChatToResultSync } from './runtime'
import { ThreadSettingsService } from './settings/thread-settings-service'

export function getThreadSelectedModel(
  threadId: string
): { provider: string; model: string } | null {
  return runChatSyncOr(
    ThreadSettingsService.use((s) => s.getThreadSelectedModel(threadId)),
    null
  )
}

export function setThreadSelectedModel(
  threadId: string,
  provider: string,
  model: string
): { success: boolean; error?: string } {
  return runChatToResultSync(
    ThreadSettingsService.use((s) =>
      s.setThreadSelectedModel(threadId, provider, model)
    ).pipe(Effect.as({}))
  )
}

export function getThreadEnabledMcpTools(
  threadId: string
): Record<string, string[]> {
  return runChatSyncOr(
    ThreadSettingsService.use((s) => s.getThreadEnabledMcpTools(threadId)),
    {}
  )
}

export function setThreadEnabledMcpTools(
  threadId: string,
  serverName: string,
  toolNames: string[]
): { success: boolean; error?: string } {
  return runChatToResultSync(
    ThreadSettingsService.use((s) =>
      s.setThreadEnabledMcpTools(threadId, serverName, toolNames)
    ).pipe(Effect.as({}))
  )
}

export function getThreadEnabledSkills(threadId: string): string[] {
  return runChatSyncOr(
    ThreadSettingsService.use((s) => s.getThreadEnabledSkills(threadId)),
    []
  )
}

export function setThreadEnabledSkill(
  threadId: string,
  name: string,
  enabled: boolean
): { success: boolean; error?: string } {
  return runChatToResultSync(
    ThreadSettingsService.use((s) =>
      s.setThreadEnabledSkill(threadId, name, enabled)
    ).pipe(Effect.as({}))
  )
}
