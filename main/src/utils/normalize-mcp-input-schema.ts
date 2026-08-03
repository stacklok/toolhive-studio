import type { JSONSchema7 } from 'ai'

/**
 * Normalize MCP tool input schemas for both discovery UI and AI SDK tools.
 * Preserves an explicit `additionalProperties` when the server sets one.
 */
export function normalizeMcpInputSchema(schema: unknown): JSONSchema7 {
  const raw = (
    schema && typeof schema === 'object'
      ? schema
      : { type: 'object', properties: {} }
  ) as JSONSchema7

  return {
    ...raw,
    type: raw.type ?? 'object',
    properties: raw.properties ?? {},
    additionalProperties: raw.additionalProperties ?? false,
  }
}

/** Lightweight guard against malformed listTools() entries before AI adaptation. */
export function isUsableMcpTool(tool: {
  name?: string
  description?: unknown
  inputSchema?: unknown
}): boolean {
  if (!tool.name || typeof tool.name !== 'string') return false

  if (tool.description !== undefined && typeof tool.description !== 'string') {
    return false
  }

  if (tool.inputSchema !== undefined) {
    if (typeof tool.inputSchema !== 'object' || tool.inputSchema === null) {
      return false
    }
  }

  return true
}
