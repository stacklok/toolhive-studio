import { describe, it, expect } from 'vitest'
import { sanitizeJsonSchema } from '../sanitize-json-schema'

describe('sanitizeJsonSchema', () => {
  it('prunes required entries that have no matching property', () => {
    const schema = {
      type: 'object',
      properties: {
        a: { type: 'string' },
      },
      required: ['a', 'missing'],
    }

    expect(sanitizeJsonSchema(schema)).toEqual({
      type: 'object',
      properties: { a: { type: 'string' } },
      required: ['a'],
    })
  })

  it('drops the required array entirely when every entry is dangling', () => {
    const schema = {
      type: 'object',
      properties: { a: { type: 'string' } },
      required: ['ghost'],
    }

    expect(sanitizeJsonSchema(schema)).toEqual({
      type: 'object',
      properties: { a: { type: 'string' } },
    })
  })

  it('prunes dangling required inside array items (the github issue_fields case)', () => {
    const schema = {
      type: 'object',
      properties: {
        issue_fields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
            },
            required: ['title', 'undefined_in_items'],
          },
        },
      },
      required: ['issue_fields'],
    }

    expect(sanitizeJsonSchema(schema)).toEqual({
      type: 'object',
      properties: {
        issue_fields: {
          type: 'array',
          items: {
            type: 'object',
            properties: { title: { type: 'string' } },
            required: ['title'],
          },
        },
      },
      required: ['issue_fields'],
    })
  })

  it('leaves valid required arrays untouched', () => {
    const schema = {
      type: 'object',
      properties: { a: { type: 'string' }, b: { type: 'number' } },
      required: ['a', 'b'],
    }

    expect(sanitizeJsonSchema(schema)).toEqual(schema)
  })

  it('drops required entirely when properties is absent (strict validators reject it)', () => {
    const schema = { type: 'object', required: ['a'] }

    expect(sanitizeJsonSchema(schema)).toEqual({ type: 'object' })
  })

  it('recurses through anyOf / allOf / oneOf and nested properties', () => {
    const schema = {
      type: 'object',
      properties: {
        a: {
          anyOf: [
            {
              type: 'object',
              properties: { x: { type: 'string' } },
              required: ['x', 'nope'],
            },
          ],
        },
      },
    }

    expect(sanitizeJsonSchema(schema)).toEqual({
      type: 'object',
      properties: {
        a: {
          anyOf: [
            {
              type: 'object',
              properties: { x: { type: 'string' } },
              required: ['x'],
            },
          ],
        },
      },
    })
  })

  it('does not mutate the input schema', () => {
    const schema = {
      type: 'object',
      properties: { a: { type: 'string' } },
      required: ['a', 'ghost'],
    }
    const snapshot = JSON.stringify(schema)

    sanitizeJsonSchema(schema)

    expect(JSON.stringify(schema)).toBe(snapshot)
  })

  it('drops non-string enums (e.g. boolean) while keeping the property', () => {
    const schema = {
      type: 'object',
      properties: {
        issue_fields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              delete: { type: 'boolean', enum: [true] },
            },
            required: ['delete'],
          },
        },
      },
    }

    expect(sanitizeJsonSchema(schema)).toEqual({
      type: 'object',
      properties: {
        issue_fields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              delete: { type: 'boolean' },
            },
            required: ['delete'],
          },
        },
      },
    })
  })

  it('preserves string enums', () => {
    const schema = {
      type: 'object',
      properties: {
        state: { type: 'string', enum: ['open', 'closed'] },
      },
    }

    expect(sanitizeJsonSchema(schema)).toEqual(schema)
  })

  it('collapses union type arrays to the first concrete type', () => {
    const schema = {
      type: 'object',
      properties: {
        value: { type: ['string', 'number', 'boolean'], description: 'v' },
      },
    }

    expect(sanitizeJsonSchema(schema)).toEqual({
      type: 'object',
      properties: {
        value: { type: 'string', description: 'v' },
      },
    })
  })

  it('maps a "null" union member to nullable', () => {
    const schema = {
      type: 'object',
      properties: {
        value: { type: ['null', 'number'] },
      },
    }

    expect(sanitizeJsonSchema(schema)).toEqual({
      type: 'object',
      properties: {
        value: { type: 'number', nullable: true },
      },
    })
  })

  it('falls back to "string" when a union has no concrete type', () => {
    const schema = {
      type: 'object',
      properties: {
        value: { type: ['null'] },
      },
    }

    expect(sanitizeJsonSchema(schema)).toEqual({
      type: 'object',
      properties: {
        value: { type: 'string', nullable: true },
      },
    })
  })

  it('passes through non-object schemas unchanged', () => {
    expect(sanitizeJsonSchema(undefined)).toBeUndefined()
    expect(sanitizeJsonSchema(null)).toBeNull()
    expect(sanitizeJsonSchema('string')).toBe('string')
    expect(sanitizeJsonSchema(42)).toBe(42)
  })
})
