import type { ModelCost } from '../hooks/use-model-pricing'
import { getCacheReadTokens, type PersistedLanguageModelUsage } from './usage'

export interface CostBreakdown {
  inputCost: number
  cachedCost: number
  outputCost: number
  totalCost: number
}

const toMillions = (tokens: number): number => tokens / 1_000_000

export function calculateCost(
  usage: PersistedLanguageModelUsage,
  pricing: ModelCost
): CostBreakdown {
  const inputTokens = Math.max(0, usage.inputTokens ?? 0)
  const outputTokens = Math.max(0, usage.outputTokens ?? 0)
  const cachedInputTokens = Math.max(0, getCacheReadTokens(usage))

  const hasCacheRate = pricing.cache_read !== undefined
  const billableInputTokens = hasCacheRate
    ? Math.max(0, inputTokens - cachedInputTokens)
    : inputTokens
  const billableCachedTokens = hasCacheRate ? cachedInputTokens : 0

  const inputCost = toMillions(billableInputTokens) * pricing.input
  const cachedCost =
    toMillions(billableCachedTokens) * (pricing.cache_read ?? 0)
  const outputCost = toMillions(outputTokens) * pricing.output

  return {
    inputCost,
    cachedCost,
    outputCost,
    totalCost: inputCost + cachedCost + outputCost,
  }
}

export function formatUsd(amount: number): string {
  if (!isFinite(amount) || amount <= 0) return '$0.00'
  if (amount < 0.01) return '<$0.01'
  if (amount >= 1) return `$${amount.toFixed(2)}`
  return `$${amount.toFixed(4)}`
}
