import { dynamicTool, jsonSchema, type JSONValue } from 'ai'
import {
  isInputRequiredResult,
  type CallToolResult,
  type Client,
  type Tool as NativeMcpTool,
} from '@modelcontextprotocol/client'
import { sanitizeJsonSchema } from '../../utils/sanitize-json-schema'
import { normalizeMcpInputSchema } from '../../utils/normalize-mcp-input-schema'

const INPUT_REQUIRED_UNSUPPORTED_MESSAGE =
  'This MCP server requested interactive input during tool execution, which the Playground does not support yet.'

function textFromCallToolContent(result: CallToolResult): string | undefined {
  if (!('content' in result) || !Array.isArray(result.content)) return undefined

  const text = result.content
    .filter(
      (part): part is { type: 'text'; text: string } =>
        part.type === 'text' && 'text' in part && typeof part.text === 'string'
    )
    .map((part) => part.text)
    .join('\n')
    .trim()

  return text.length > 0 ? text : undefined
}

function mcpCallToolResultToModelOutput({
  output,
}: {
  toolCallId: string
  input: unknown
  output: unknown
}) {
  const result = output as CallToolResult

  if (result && typeof result === 'object' && result.isError) {
    const errorText = textFromCallToolContent(result)
    if (errorText) {
      return { type: 'error-text' as const, value: errorText }
    }
    return { type: 'error-json' as const, value: result as JSONValue }
  }

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
  const normalized = normalizeMcpInputSchema(params.definition.inputSchema)
  const inputSchema = params.sanitizeSchema
    ? (sanitizeJsonSchema(normalized) as typeof normalized)
    : normalized

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
