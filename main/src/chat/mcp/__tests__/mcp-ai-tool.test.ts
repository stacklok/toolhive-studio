import { describe, it, expect, vi } from 'vitest'
import { asSchema } from 'ai'
import { createAiMcpTool } from '../mcp-ai-tool'
import type {
  Client,
  Tool as NativeMcpTool,
} from '@modelcontextprotocol/client'

function makeClient(callToolImpl: Client['callTool'] = vi.fn()): Client {
  return { callTool: callToolImpl } as unknown as Client
}

function makeTool(overrides: Partial<NativeMcpTool> = {}): NativeMcpTool {
  return {
    name: 'demo',
    description: 'demo tool',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: true,
    },
    ...overrides,
  } as NativeMcpTool
}

describe('createAiMcpTool', () => {
  it('preserves additionalProperties: true from the server schema', () => {
    const tool = createAiMcpTool({
      client: makeClient(),
      toolName: 'demo',
      definition: makeTool(),
    })

    expect(asSchema(tool.inputSchema).jsonSchema).toMatchObject({
      additionalProperties: true,
    })
  })

  it('maps isError tool results to error-text for the model', async () => {
    const tool = createAiMcpTool({
      client: makeClient(),
      toolName: 'demo',
      definition: makeTool(),
    })

    const output = await tool.toModelOutput?.({
      toolCallId: 'call-1',
      input: {},
      output: {
        isError: true,
        content: [{ type: 'text', text: 'tool blew up' }],
      },
    })

    expect(output).toEqual({
      type: 'error-text',
      value: 'tool blew up',
    })
  })

  it('maps successful content results to content blocks', async () => {
    const tool = createAiMcpTool({
      client: makeClient(),
      toolName: 'demo',
      definition: makeTool(),
    })

    const output = await tool.toModelOutput?.({
      toolCallId: 'call-1',
      input: {},
      output: {
        content: [{ type: 'text', text: 'ok' }],
      },
    })

    expect(output).toEqual({
      type: 'content',
      value: [{ type: 'text', text: 'ok' }],
    })
  })
})
