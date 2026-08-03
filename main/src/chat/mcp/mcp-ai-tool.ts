import { dynamicTool, jsonSchema, type JSONSchema7, type JSONValue } from 'ai'
import {
  isInputRequiredResult,
  type CallToolResult,
  type Client,
  type Tool as NativeMcpTool,
} from '@modelcontextprotocol/client'
import { sanitizeJsonSchema } from '../../utils/sanitize-json-schema'

const INPUT_REQUIRED_UNSUPPORTED_MESSAGE =
  'This MCP server requested interactive input during tool execution, which the Playground does not support yet.'

function normalizeInputSchema(schema: unknown, sanitize: boolean): JSONSchema7 {
  const raw = (
    schema && typeof schema === 'object'
      ? schema
      : { type: 'object', properties: {} }
  ) as JSONSchema7

  const normalized: JSONSchema7 = {
    ...raw,
    type: raw.type ?? 'object',
    properties: raw.properties ?? {},
    additionalProperties: raw.additionalProperties ?? false,
  }

  return sanitize ? (sanitizeJsonSchema(normalized) as JSONSchema7) : normalized
}

function mcpCallToolResultToModelOutput({
  output,
}: {
  toolCallId: string
  input: unknown
  output: unknown
}) {
  const result = output as CallToolResult

  if (!('content' in result) || !Array.isArray(result.content)) {
    return { type: 'json' as const, value: result as JSONValue }
  }

  const convertedContent = result.content.map(
    (part: { type: string; [key: string]: unknown }) => {
      if (part.type === 'text' && 'text' in part) {
        return { type: 'text' as const, text: part.text as string }
      }
      if (part.type === 'image' && 'data' in part && 'mimeType' in part) {
        return {
          type: 'file' as const,
          mediaType: part.mimeType as string,
          data: { type: 'data' as const, data: part.data as string },
        }
      }
      return { type: 'text' as const, text: JSON.stringify(part) }
    }
  )

  return { type: 'content' as const, value: convertedContent }
}

export function createAiMcpTool(params: {
  client: Client
  toolName: string
  definition: NativeMcpTool
  sanitizeSchema?: boolean
}) {
  const inputSchema = normalizeInputSchema(
    params.definition.inputSchema,
    params.sanitizeSchema ?? false
  )

  return dynamicTool({
    description: params.definition.description ?? params.toolName,
    inputSchema: jsonSchema(inputSchema),
    execute: async (args, options) => {
      options?.abortSignal?.throwIfAborted()

      const result = await params.client.callTool(
        {
          name: params.toolName,
          arguments: args as Record<string, unknown>,
        },
        { signal: options?.abortSignal }
      )

      if (isInputRequiredResult(result)) {
        throw new Error(INPUT_REQUIRED_UNSUPPORTED_MESSAGE)
      }

      return result
    },
    toModelOutput: mcpCallToolResultToModelOutput,
  })
}
