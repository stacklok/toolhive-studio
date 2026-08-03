import { describe, it, expect } from 'vitest'
import {
  isUsableMcpTool,
  normalizeMcpInputSchema,
} from '../normalize-mcp-input-schema'

describe('normalizeMcpInputSchema', () => {
  it('defaults missing fields and additionalProperties to false', () => {
    expect(normalizeMcpInputSchema({})).toEqual({
      type: 'object',
      properties: {},
      additionalProperties: false,
    })
  })

  it('preserves explicit additionalProperties: true', () => {
    expect(
      normalizeMcpInputSchema({
        type: 'object',
        properties: { q: { type: 'string' } },
        additionalProperties: true,
      })
    ).toMatchObject({
      additionalProperties: true,
      properties: { q: { type: 'string' } },
    })
  })
})

describe('isUsableMcpTool', () => {
  it('accepts a well-formed tool', () => {
    expect(
      isUsableMcpTool({
        name: 'ok',
        description: 'fine',
        inputSchema: { type: 'object', properties: {} },
      })
    ).toBe(true)
  })

  it('rejects non-string descriptions and non-object schemas', () => {
    expect(
      isUsableMcpTool({
        name: 'bad',
        description: 42 as unknown as string,
      })
    ).toBe(false)
    expect(
      isUsableMcpTool({
        name: 'bad',
        inputSchema: 'nope',
      })
    ).toBe(false)
    expect(isUsableMcpTool({ name: '' })).toBe(false)
  })
})
