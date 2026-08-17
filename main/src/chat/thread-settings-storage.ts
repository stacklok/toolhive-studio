import { Effect } from 'effect'
import { runChatSyncOr, runChatToResultSync } from './runtime'
import { ThreadSettingsService } from './settings/thread-settings-service'

export function getThreadSelectedModel(
  threadId: string
): { provider: string; model: string } | null {
  return runChatSyncOr(
    ThreadSettingsService.getThreadSelectedModel(threadId),
    null
  )
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
  return runChatSyncOr(
    ThreadSettingsService.getThreadEnabledMcpTools(threadId),
    {}
  )
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

export function getThreadAcpCwd(threadId: string): string | null {
  return runChatSyncOr(ThreadSettingsService.getThreadAcpCwd(threadId), null)
}

export function setThreadAcpCwd(
  threadId: string,
  cwd: string | null
): { success: boolean; error?: string } {
  return runChatToResultSync(
    ThreadSettingsService.setThreadAcpCwd(threadId, cwd).pipe(Effect.as({}))
  )
}

export function getThreadEnabledSkills(threadId: string): string[] {
  return runChatSyncOr(
    ThreadSettingsService.getThreadEnabledSkills(threadId),
    []
  )
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
