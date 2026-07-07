import { describe, it, expect } from 'vitest'
import { calculateCost, formatUsd } from '../calculate-cost'

describe('calculateCost', () => {
  it('computes input/output cost from per-million pricing', () => {
    // GPT-4o pricing: $2.5/M input, $10/M output
    const result = calculateCost(
      {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        totalTokens: 2_000_000,
      },
      { input: 2.5, output: 10 }
    )
    expect(result.inputCost).toBeCloseTo(2.5)
    expect(result.outputCost).toBeCloseTo(10)
    expect(result.cachedCost).toBe(0)
    expect(result.totalCost).toBeCloseTo(12.5)
  })

  it('applies cache_read rate to cachedInputTokens and excludes them from base input cost', () => {
    // Claude Sonnet 4.5: input 3, output 15, cache_read 0.3
    const result = calculateCost(
      {
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
        cachedInputTokens: 400,
      },
      { input: 3, output: 15, cache_read: 0.3 }
    )
    // billable input = 600, cached = 400
    expect(result.inputCost).toBeCloseTo((600 / 1_000_000) * 3)
    expect(result.cachedCost).toBeCloseTo((400 / 1_000_000) * 0.3)
    expect(result.outputCost).toBeCloseTo((500 / 1_000_000) * 15)
    expect(result.totalCost).toBeCloseTo(
      result.inputCost + result.cachedCost + result.outputCost
    )
  })

  it('reads cacheReadTokens from AI SDK v7 inputTokenDetails', () => {
    const result = calculateCost(
      {
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
        inputTokenDetails: {
          noCacheTokens: 600,
          cacheReadTokens: 400,
          cacheWriteTokens: undefined,
        },
        outputTokenDetails: {
          textTokens: undefined,
          reasoningTokens: undefined,
        },
      },
      { input: 3, output: 15, cache_read: 0.3 }
    )
    expect(result.inputCost).toBeCloseTo((600 / 1_000_000) * 3)
    expect(result.cachedCost).toBeCloseTo((400 / 1_000_000) * 0.3)
  })

  it('falls back to full input rate when cache_read is missing', () => {
    const result = calculateCost(
      {
        inputTokens: 1000,
        outputTokens: 0,
        totalTokens: 1000,
        cachedInputTokens: 400,
      },
      { input: 3, output: 15 }
    )
    // No cache_read → all 1000 tokens billed at input rate
    expect(result.inputCost).toBeCloseTo((1000 / 1_000_000) * 3)
    expect(result.cachedCost).toBe(0)
  })

  it('returns zero costs for zero token usage', () => {
    const result = calculateCost(
      { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      { input: 5, output: 15 }
    )
    expect(result.inputCost).toBe(0)
    expect(result.outputCost).toBe(0)
    expect(result.totalCost).toBe(0)
  })

  it('clamps negative or undefined token values to zero', () => {
    const result = calculateCost(
      {
        inputTokens: undefined,
        outputTokens: undefined,
        totalTokens: undefined,
      },
      { input: 5, output: 15 }
    )
    expect(result.totalCost).toBe(0)
  })
})

describe('formatUsd', () => {
  it('formats sub-cent amounts as <$0.01', () => {
    expect(formatUsd(0.0001)).toBe('<$0.01')
  })

  it('formats cents with 4 decimal places between $0.01 and $1', () => {
    expect(formatUsd(0.0423)).toBe('$0.0423')
  })

  it('formats amounts >= $1 with 2 decimal places', () => {
    expect(formatUsd(1.234)).toBe('$1.23')
  })

  it('renders $0.00 for zero or invalid amounts', () => {
    expect(formatUsd(0)).toBe('$0.00')
    expect(formatUsd(NaN)).toBe('$0.00')
    expect(formatUsd(-1)).toBe('$0.00')
  })
})
