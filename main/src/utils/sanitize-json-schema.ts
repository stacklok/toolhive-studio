/**
 * Recursively sanitizes a JSON Schema so it is accepted by strict
 * function-calling validators, notably Google Gemini.
 *
 * Fixes applied at every schema node:
 * - Prune `required` entries with no matching `properties` key (Google rejects
 *   dangling required references).
 * - Drop `enum` when any member is not a string (Google only allows string
 *   enums, e.g. `{ type: 'boolean', enum: [true] }` is rejected).
 * - Collapse JSON Schema union `type` arrays to a single type; map a `null`
 *   member to `nullable: true`.
 *
 * The input is never mutated.
 */
type JsonSchemaObject = Record<string, unknown>

const COMPOSITION_KEYS = ['anyOf', 'oneOf', 'allOf'] as const
const DEFINITION_KEYS = ['$defs', 'definitions'] as const

export function sanitizeJsonSchema(schema: unknown): unknown {
  return sanitizeNode(schema)
}

function sanitizeNode(node: unknown): unknown {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return node
  const result: JsonSchemaObject = { ...(node as JsonSchemaObject) }

  if (isPlainObject(result.properties)) {
    result.properties = mapValues(result.properties, sanitizeNode)
  }

  if (result.items !== undefined) {
    result.items = Array.isArray(result.items)
      ? (result.items as unknown[]).map(sanitizeNode)
      : sanitizeNode(result.items)
  }

  for (const key of COMPOSITION_KEYS) {
    if (Array.isArray(result[key])) {
      result[key] = (result[key] as unknown[]).map(sanitizeNode)
    }
  }

  for (const key of DEFINITION_KEYS) {
    if (isPlainObject(result[key])) {
      result[key] = mapValues(result[key] as JsonSchemaObject, sanitizeNode)
    }
  }

  sanitizeGeminiConstraints(result)

  // Prune `required` entries that have no matching property. Strict
  // validators (Google Gemini) reject any `required` entry that is not a key
  // in the same level's `properties` — including the case where `properties`
  // is absent entirely (e.g. an array `items` sub-schema that lists
  // `required` but defines no inline properties). Drop those dangling
  // entries; a `required` with no corresponding property is a no-op anyway.
  if (Array.isArray(result.required)) {
    const propKeys = isPlainObject(result.properties)
      ? new Set(Object.keys(result.properties as JsonSchemaObject))
      : new Set<string>()
    const original = result.required as unknown[]
    const filtered = original.filter(
      (entry): entry is string =>
        typeof entry === 'string' && propKeys.has(entry)
    )
    if (filtered.length < original.length) {
      if (filtered.length > 0) result.required = filtered
      else delete result.required
    }
  }

  return result
}

/** Gemini-only constraints applied in place on a copied schema node. */
function sanitizeGeminiConstraints(node: JsonSchemaObject): void {
  if (
    Array.isArray(node.enum) &&
    !node.enum.every((value) => typeof value === 'string')
  ) {
    delete node.enum
  }

  if (Array.isArray(node.type)) {
    const types = node.type.filter(
      (t): t is string => typeof t === 'string' && t !== 'null'
    )
    if (node.type.includes('null')) node.nullable = true
    node.type = types[0] ?? 'string'
  }
}

function isPlainObject(value: unknown): value is JsonSchemaObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mapValues(
  obj: JsonSchemaObject,
  fn: (value: unknown) => unknown
): JsonSchemaObject {
  const out: JsonSchemaObject = {}
  for (const [key, value] of Object.entries(obj)) out[key] = fn(value)
  return out
}
