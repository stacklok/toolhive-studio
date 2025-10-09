import { describe, it, expect } from 'vitest'
import { getApiV1BetaWorkloadsQueryKey } from '@api/@tanstack/react-query.gen'

describe('Query Key Collision Bug Investigation', () => {
  it('should generate different keys for queries with and without group parameter', () => {
    const keyWithGroup = getApiV1BetaWorkloadsQueryKey({
      query: { all: true, group: 'default' },
    })

    const keyWithoutGroup = getApiV1BetaWorkloadsQueryKey({
      query: { all: true },
    })

    // These should be DIFFERENT keys
    expect(JSON.stringify(keyWithGroup)).not.toBe(JSON.stringify(keyWithoutGroup))

    console.log('Key with group:', JSON.stringify(keyWithGroup, null, 2))
    console.log('Key without group:', JSON.stringify(keyWithoutGroup, null, 2))
  })

  it('should generate different keys for different groups', () => {
    const keyDefault = getApiV1BetaWorkloadsQueryKey({
      query: { all: true, group: 'default' },
    })

    const keyTestGroup = getApiV1BetaWorkloadsQueryKey({
      query: { all: true, group: 'test-group' },
    })

    expect(JSON.stringify(keyDefault)).not.toBe(JSON.stringify(keyTestGroup))

    console.log('Key for default:', JSON.stringify(keyDefault, null, 2))
    console.log('Key for test-group:', JSON.stringify(keyTestGroup, null, 2))
  })

  it('should show how empty string group differs from undefined', () => {
    const keyEmptyString = getApiV1BetaWorkloadsQueryKey({
      query: { all: true, group: '' },
    })

    const keyUndefined = getApiV1BetaWorkloadsQueryKey({
      query: { all: true, group: undefined },
    })

    const keyNoGroupField = getApiV1BetaWorkloadsQueryKey({
      query: { all: true },
    })

    console.log('Key with empty string:', JSON.stringify(keyEmptyString, null, 2))
    console.log('Key with undefined:', JSON.stringify(keyUndefined, null, 2))
    console.log('Key without group field:', JSON.stringify(keyNoGroupField, null, 2))

    // Check if undefined and missing field create the same key
    expect(JSON.stringify(keyUndefined)).toBe(JSON.stringify(keyNoGroupField))
  })

  it('demonstrates that query keys properly differentiate group parameters', () => {
    // This test proves that React Query keys are properly differentiated
    const keys = [
      getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
      getApiV1BetaWorkloadsQueryKey({ query: { all: true, group: '' } }),
      getApiV1BetaWorkloadsQueryKey({ query: { all: true, group: 'default' } }),
      getApiV1BetaWorkloadsQueryKey({ query: { all: true, group: 'test-group' } }),
    ]

    const stringifiedKeys = keys.map(k => JSON.stringify(k))
    const uniqueKeys = new Set(stringifiedKeys)

    console.log('All keys:', stringifiedKeys.map((k, i) => `\n${i}: ${k}`).join(''))
    console.log(`\nUnique keys: ${uniqueKeys.size} out of ${keys.length}`)

    // We expect 3 unique keys (undefined and '' might collapse to same key)
    expect(uniqueKeys.size).toBeGreaterThanOrEqual(3)
  })
})
