import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ChatUIMessage } from '../../../types'
import { ToolCallComponent } from '../tool-call-component'
import { _resetDisclosureStore } from '../../../lib/disclosure-store'

beforeEach(() => {
  _resetDisclosureStore()
})

// `ToolOutputContent` is exercised end-to-end in its own suite — stub here
// so we only exercise `ToolCallComponent`'s state/branch logic.
vi.mock('../tool-output-content', () => ({
  ToolOutputContent: ({ output }: { output: unknown }) => (
    <div data-testid="tool-output">{JSON.stringify(output)}</div>
  ),
}))

type Part = ChatUIMessage['parts'][0]

function makeStaticToolPart(overrides: Record<string, unknown> = {}): Part {
  return {
    type: 'tool-search',
    toolCallId: 'call-1234567890abcdef',
    state: 'output-available',
    input: { query: 'kittens' },
    output: { matches: 7 },
    ...overrides,
  } as unknown as Part
}

function makeDynamicToolPart(overrides: Record<string, unknown> = {}): Part {
  return {
    type: 'dynamic-tool',
    toolName: 'lookup_user',
    toolCallId: 'call-dynamic-1',
    state: 'input-streaming',
    input: { id: 5 },
    ...overrides,
  } as unknown as Part
}

describe('ToolCallComponent', () => {
  it('renders nothing for non-tool parts', () => {
    const part = { type: 'text', text: 'hi' } as unknown as Part
    const { container } = render(
      <ToolCallComponent part={part} status="ready" />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('derives the tool name from the part type for static tool-* parts', () => {
    render(<ToolCallComponent part={makeStaticToolPart()} status="ready" />)
    expect(screen.getByText('Tool: search')).toBeInTheDocument()
  })

  it('uses `toolName` for dynamic-tool parts', () => {
    render(<ToolCallComponent part={makeDynamicToolPart()} status="ready" />)
    expect(screen.getByText('Tool: lookup_user')).toBeInTheDocument()
  })

  it('surfaces only the trailing 8 chars of the tool call id in the badge', () => {
    render(<ToolCallComponent part={makeStaticToolPart()} status="ready" />)
    expect(screen.getByText('ID: 90abcdef')).toBeInTheDocument()
  })

  it('shows the streaming spinner while state is `input-streaming`', () => {
    render(<ToolCallComponent part={makeDynamicToolPart()} status="ready" />)
    expect(screen.getAllByText(/Streaming\.\.\./).length).toBeGreaterThan(0)
  })

  it('renders the error block only when state is `output-error`', () => {
    const happy = render(
      <ToolCallComponent part={makeStaticToolPart()} status="ready" />
    )
    expect(happy.queryByText('Tool Execution Error')).not.toBeInTheDocument()
    happy.unmount()

    render(
      <ToolCallComponent
        part={makeStaticToolPart({
          state: 'output-error',
          errorText: 'boom',
        })}
        status="ready"
      />
    )
    expect(screen.getByText('Tool Execution Error')).toBeInTheDocument()
    expect(screen.getByText('boom')).toBeInTheDocument()
  })

  it('only mounts the input pre-block after the user expands "Input Parameters"', async () => {
    const user = userEvent.setup()
    render(<ToolCallComponent part={makeStaticToolPart()} status="ready" />)

    expect(screen.queryByText(/"query": "kittens"/)).not.toBeInTheDocument()
    await user.click(screen.getByText('Input Parameters'))
    expect(screen.getByText(/"query": "kittens"/)).toBeInTheDocument()
  })

  it('only mounts ToolOutputContent after the user expands "Tool Result"', async () => {
    const user = userEvent.setup()
    render(<ToolCallComponent part={makeStaticToolPart()} status="ready" />)

    expect(screen.queryByTestId('tool-output')).not.toBeInTheDocument()
    await user.click(screen.getByText('Tool Result'))
    expect(screen.getByTestId('tool-output')).toHaveTextContent('{"matches":7}')
  })

  it('marks the call as Completed when both input and output are present', () => {
    render(<ToolCallComponent part={makeStaticToolPart()} status="ready" />)
    expect(screen.getByText(/Completed/)).toBeInTheDocument()
  })

  it('preserves all three disclosure slots independently across remount when a disclosureKey is provided', async () => {
    const user = userEvent.setup()
    const props = {
      part: makeStaticToolPart(),
      status: 'ready' as const,
      disclosureKey: 'msg-1:2',
    }

    // Open Tool Result and Tool Details, leave Input Parameters closed.
    const first = render(<ToolCallComponent {...props} />)
    await user.click(screen.getByText('Tool Result'))
    await user.click(screen.getByText('Tool Details'))
    expect(screen.getByTestId('tool-output')).toBeInTheDocument()
    expect(screen.getByText(/Tool Name:/)).toBeInTheDocument()
    expect(screen.queryByText(/"query": "kittens"/)).not.toBeInTheDocument()
    first.unmount()

    // Same key after unmount + remount: each slot's open/closed state is
    // restored independently — output and details stay open, input stays
    // closed.
    render(<ToolCallComponent {...props} />)
    expect(screen.getByTestId('tool-output')).toBeInTheDocument()
    expect(screen.getByText(/Tool Name:/)).toBeInTheDocument()
    expect(screen.queryByText(/"query": "kittens"/)).not.toBeInTheDocument()
  })
})
