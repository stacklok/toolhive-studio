import type { LanguageModelUsage } from 'ai'

/** Persisted usage may predate AI SDK v7 and carry legacy top-level keys. */
export type PersistedLanguageModelUsage = Partial<LanguageModelUsage> & {
  cachedInputTokens?: number
  reasoningTokens?: number
}

/** Sum two optional token counts, returning undefined only when both are. */
function addCount(
  a: number | undefined,
  b: number | undefined
): number | undefined {
  if (a == null && b == null) return undefined
  return (a ?? 0) + (b ?? 0)
}

/** Accumulate per-step usage into a running total for message metadata. */
export function addUsage(
  acc: LanguageModelUsage | null,
  next: LanguageModelUsage | undefined | null
): LanguageModelUsage | null {
  if (!next) return acc
  if (!acc) return { ...next }
  const inputTokenDetails = buildInputTokenDetails(acc, next)
  const outputTokenDetails = buildOutputTokenDetails(acc, next)
  return {
    inputTokens: addCount(acc.inputTokens, next.inputTokens),
    outputTokens: addCount(acc.outputTokens, next.outputTokens),
    totalTokens: addCount(acc.totalTokens, next.totalTokens),
    ...(inputTokenDetails ? { inputTokenDetails } : {}),
    ...(outputTokenDetails ? { outputTokenDetails } : {}),
  } as LanguageModelUsage
}

function buildInputTokenDetails(
  acc: LanguageModelUsage,
  next: LanguageModelUsage
): LanguageModelUsage['inputTokenDetails'] | undefined {
  const details = {
    noCacheTokens: addCount(
      acc.inputTokenDetails?.noCacheTokens,
      next.inputTokenDetails?.noCacheTokens
    ),
    cacheReadTokens: addCount(
      acc.inputTokenDetails?.cacheReadTokens,
      next.inputTokenDetails?.cacheReadTokens
    ),
    cacheWriteTokens: addCount(
      acc.inputTokenDetails?.cacheWriteTokens,
      next.inputTokenDetails?.cacheWriteTokens
    ),
  }
  return Object.values(details).some((value) => value != null)
    ? details
    : undefined
}

function buildOutputTokenDetails(
  acc: LanguageModelUsage,
  next: LanguageModelUsage
): LanguageModelUsage['outputTokenDetails'] | undefined {
  const details = {
    textTokens: addCount(
      acc.outputTokenDetails?.textTokens,
      next.outputTokenDetails?.textTokens
    ),
    reasoningTokens: addCount(
      acc.outputTokenDetails?.reasoningTokens,
      next.outputTokenDetails?.reasoningTokens
    ),
  }
  return Object.values(details).some((value) => value != null)
    ? details
    : undefined
}

export function getCacheReadTokens(
  usage: PersistedLanguageModelUsage
): number | undefined {
  return usage.inputTokenDetails?.cacheReadTokens ?? usage.cachedInputTokens
}

export function getReasoningTokens(
  usage: PersistedLanguageModelUsage
): number | undefined {
  return usage.outputTokenDetails?.reasoningTokens ?? usage.reasoningTokens
}
