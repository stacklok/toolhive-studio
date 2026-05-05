import { describe, it, expect } from 'vitest'
import { hasMcpUiPart } from '../has-mcp-ui-part'
import type { ChatUIMessage } from '../../types'
import type { ToolUiMetadataEntry } from '../../hooks/use-mcp-app-metadata'

const ui: Record<string, ToolUiMetadataEntry> = {
  weather: { resourceUri: 'ui://weather/view.html', serverName: 's1' },
}

function msg(role: 'user' | 'assistant', parts: unknown[]): ChatUIMessage {
  return { id: 'x', role, parts } as unknown as ChatUIMessage
}

describe('hasMcpUiPart', () => {
  it('returns false for user messages, even when they carry tool-shaped parts', () => {
    expect(
      hasMcpUiPart(
        msg('user', [
          {
            type: 'tool-weather',
            state: 'output-available',
            input: {},
            output: {},
          },
        ]),
        ui
      )
    ).toBe(false)
  })

  it('returns false when the tool is not registered with UI metadata', () => {
    expect(
      hasMcpUiPart(
        msg('assistant', [
          {
            type: 'tool-weather',
            state: 'output-available',
            input: {},
            output: {},
          },
        ]),
        {}
      )
    ).toBe(false)
  })

  it('returns false while the tool is still streaming (no output yet)', () => {
    expect(
      hasMcpUiPart(
        msg('assistant', [
          { type: 'tool-weather', state: 'input-available', input: {} },
        ]),
        ui
      )
    ).toBe(false)
  })

  it('returns true when an assistant tool-result has matching UI metadata', () => {
    expect(
      hasMcpUiPart(
        msg('assistant', [
          {
            type: 'tool-weather',
            state: 'output-available',
            input: {},
            output: {},
          },
        ]),
        ui
      )
    ).toBe(true)
  })

  it('also matches the dynamic-tool variant', () => {
    expect(
      hasMcpUiPart(
        msg('assistant', [
          {
            type: 'dynamic-tool',
            toolName: 'weather',
            state: 'output-available',
            input: {},
            output: {},
          },
        ]),
        ui
      )
    ).toBe(true)
  })

  it('returns true if any part triggers the UI, even when other parts do not', () => {
    expect(
      hasMcpUiPart(
        msg('assistant', [
          { type: 'text', text: 'hi' },
          {
            type: 'tool-weather',
            state: 'output-available',
            input: {},
            output: {},
          },
        ]),
        ui
      )
    ).toBe(true)
  })
})
