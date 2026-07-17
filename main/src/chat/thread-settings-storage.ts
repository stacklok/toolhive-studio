import { Effect } from 'effect'
import { runChatSync, runChatToResultSync } from './runtime'
import { ThreadSettingsService } from './settings/thread-settings-service'

export function getThreadSelectedModel(
  threadId: string
): { provider: string; model: string } | null {
  return runChatSync(ThreadSettingsService.getThreadSelectedModel(threadId))
}

export function setThreadSelectedModel(
  threadId: string,
  provider: string,
  model: string
): { success: boolean; error?: string } {
  return runChatToResultSync(
    ThreadSettingsService.setThreadSelectedModel(
      threadId,
      provider,
      model
    ).pipe(Effect.as({}))
  )
}

export function getThreadEnabledMcpTools(
  threadId: string
): Record<string, string[]> {
  return runChatSync(ThreadSettingsService.getThreadEnabledMcpTools(threadId))
}

export function setThreadEnabledMcpTools(
  threadId: string,
  serverName: string,
  toolNames: string[]
): { success: boolean; error?: string } {
  return runChatToResultSync(
    ThreadSettingsService.setThreadEnabledMcpTools(
      threadId,
      serverName,
      toolNames
    ).pipe(Effect.as({}))
  )
}

export function getThreadEnabledSkills(threadId: string): string[] {
  return runChatSync(ThreadSettingsService.getThreadEnabledSkills(threadId))
}

export function setThreadEnabledSkill(
  threadId: string,
  name: string,
  enabled: boolean
): { success: boolean; error?: string } {
  return runChatToResultSync(
    ThreadSettingsService.setThreadEnabledSkill(threadId, name, enabled).pipe(
      Effect.as({})
    )
  )
}
