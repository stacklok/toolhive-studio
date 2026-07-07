import type { LanguageModelUsage } from 'ai'

/** Persisted usage may predate AI SDK v7 and carry legacy top-level keys. */
export type PersistedLanguageModelUsage = Partial<LanguageModelUsage> & {
  cachedInputTokens?: number
  reasoningTokens?: number
}

export function getCacheReadTokens(usage: PersistedLanguageModelUsage): number {
  return (
    usage.inputTokenDetails?.cacheReadTokens ?? usage.cachedInputTokens ?? 0
  )
}

export function getReasoningTokens(usage: PersistedLanguageModelUsage): number {
  return usage.outputTokenDetails?.reasoningTokens ?? usage.reasoningTokens ?? 0
}
