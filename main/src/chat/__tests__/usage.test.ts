import { describe, it, expect } from 'vitest'
import type { LanguageModelUsage } from 'ai'
import { addUsage, getCacheReadTokens, getReasoningTokens } from '../usage'

function usage(partial: Partial<LanguageModelUsage>): LanguageModelUsage {
  return {
    inputTokens: partial.inputTokens,
    outputTokens: partial.outputTokens,
    totalTokens: partial.totalTokens,
    inputTokenDetails: partial.inputTokenDetails ?? {
      noCacheTokens: undefined,
      cacheReadTokens: undefined,
      cacheWriteTokens: undefined,
    },
    outputTokenDetails: partial.outputTokenDetails ?? {
      textTokens: undefined,
      reasoningTokens: undefined,
    },
  }
}

describe('addUsage', () => {
  it('returns null when next usage is null or undefined', () => {
    const acc = usage({
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
    })

    expect(addUsage(acc, null)).toBe(acc)
    expect(addUsage(acc, undefined)).toBe(acc)
  })

  it('returns a copy of next when acc is null', () => {
    const next = usage({
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
    })

    expect(addUsage(null, next)).toEqual(next)
  })

  it('accumulates top-level token counts across steps', () => {
    const stepOne = usage({
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
    })
    const stepTwo = usage({
      inputTokens: 20,
      outputTokens: 10,
      totalTokens: 30,
    })

    expect(addUsage(stepOne, stepTwo)).toEqual(
      usage({
        inputTokens: 120,
        outputTokens: 60,
        totalTokens: 180,
      })
    )
  })

  it('accumulates AI SDK v7 token detail fields across steps', () => {
    const stepOne = usage({
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      inputTokenDetails: {
        noCacheTokens: 80,
        cacheReadTokens: 20,
        cacheWriteTokens: 5,
      },
      outputTokenDetails: {
        textTokens: 45,
        reasoningTokens: 5,
      },
    })
    const stepTwo = usage({
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      inputTokenDetails: {
        noCacheTokens: 6,
        cacheReadTokens: 4,
        cacheWriteTokens: undefined,
      },
      outputTokenDetails: {
        textTokens: 4,
        reasoningTokens: 1,
      },
    })

    expect(addUsage(stepOne, stepTwo)).toEqual(
      usage({
        inputTokens: 110,
        outputTokens: 55,
        totalTokens: 165,
        inputTokenDetails: {
          noCacheTokens: 86,
          cacheReadTokens: 24,
          cacheWriteTokens: 5,
        },
        outputTokenDetails: {
          textTokens: 49,
          reasoningTokens: 6,
        },
      })
    )
  })

  it('leaves detail sub-fields undefined when neither step reports them', () => {
    expect(
      addUsage(
        usage({ inputTokens: 1, outputTokens: 2, totalTokens: 3 }),
        usage({ inputTokens: 4, outputTokens: 5, totalTokens: 9 })
      )
    ).toEqual(
      usage({
        inputTokens: 5,
        outputTokens: 7,
        totalTokens: 12,
      })
    )
  })
})

describe('getCacheReadTokens', () => {
  it('reads cacheReadTokens from AI SDK v7 inputTokenDetails', () => {
    expect(
      getCacheReadTokens({
        inputTokenDetails: {
          noCacheTokens: undefined,
          cacheReadTokens: 400,
          cacheWriteTokens: undefined,
        },
      })
    ).toBe(400)
  })

  it('falls back to legacy cachedInputTokens for persisted v6 metadata', () => {
    expect(getCacheReadTokens({ cachedInputTokens: 250 })).toBe(250)
  })

  it('prefers v7 inputTokenDetails over legacy cachedInputTokens', () => {
    expect(
      getCacheReadTokens({
        inputTokenDetails: {
          noCacheTokens: undefined,
          cacheReadTokens: 400,
          cacheWriteTokens: undefined,
        },
        cachedInputTokens: 250,
      })
    ).toBe(400)
  })
})

describe('getReasoningTokens', () => {
  it('reads reasoningTokens from AI SDK v7 outputTokenDetails', () => {
    expect(
      getReasoningTokens({
        outputTokenDetails: {
          textTokens: undefined,
          reasoningTokens: 50,
        },
      })
    ).toBe(50)
  })

  it('falls back to legacy reasoningTokens for persisted v6 metadata', () => {
    expect(getReasoningTokens({ reasoningTokens: 25 })).toBe(25)
  })

  it('prefers v7 outputTokenDetails over legacy reasoningTokens', () => {
    expect(
      getReasoningTokens({
        outputTokenDetails: {
          textTokens: undefined,
          reasoningTokens: 50,
        },
        reasoningTokens: 25,
      })
    ).toBe(50)
  })
})
