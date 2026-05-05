import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import type { ChatUIMessage } from '../../../types'
import { ReasoningComponent } from '../reasoning-component'
import { _resetDisclosureStore } from '../../../lib/disclosure-store'

beforeEach(() => {
  _resetDisclosureStore()
})

vi.mock('streamdown', () => ({
  Streamdown: ({ children }: { children: ReactNode }) => (
    <div data-testid="streamdown">{children}</div>
  ),
}))
vi.mock('@streamdown/code', () => ({ code: {} }))
vi.mock('@streamdown/mermaid', () => ({ mermaid: {} }))
vi.mock('@streamdown/cjk', () => ({ cjk: {} }))

type Part = ChatUIMessage['parts'][0]

function reasoningPart(text?: string): Part {
  return { type: 'reasoning', ...(text !== undefined ? { text } : {}) } as Part
}

describe('ReasoningComponent', () => {
  it('renders nothing for non-reasoning parts', () => {
    const part = { type: 'text', text: 'hi' } as unknown as Part
    const { container } = render(
      <ReasoningComponent part={part} status="ready" />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders collapsed by default with the toggle button visible', () => {
    render(
      <ReasoningComponent part={reasoningPart('thinking…')} status="ready" />
    )
    expect(screen.getByText('AI Reasoning')).toBeInTheDocument()
    expect(screen.getByText('View reasoning steps')).toBeInTheDocument()
    expect(screen.queryByTestId('streamdown')).not.toBeInTheDocument()
  })

  it('toggles the Streamdown body open and closed', async () => {
    const user = userEvent.setup()
    render(
      <ReasoningComponent part={reasoningPart('thinking…')} status="ready" />
    )

    await user.click(screen.getByText('View reasoning steps'))
    expect(screen.getByTestId('streamdown')).toHaveTextContent('thinking…')

    await user.click(screen.getByText('View reasoning steps'))
    expect(screen.queryByTestId('streamdown')).not.toBeInTheDocument()
  })

  it('falls back to a placeholder when the reasoning part has no text', async () => {
    const user = userEvent.setup()
    render(<ReasoningComponent part={reasoningPart()} status="ready" />)
    await user.click(screen.getByText('View reasoning steps'))
    expect(screen.getByTestId('streamdown')).toHaveTextContent(
      'No reasoning content'
    )
  })

  it('preserves expanded/collapsed state across remount when a disclosureKey is provided', async () => {
    const user = userEvent.setup()
    const props = {
      part: reasoningPart('thinking…'),
      status: 'ready' as const,
      disclosureKey: 'msg-1:0',
    }

    const { unmount } = render(<ReasoningComponent {...props} />)
    expect(screen.queryByTestId('streamdown')).not.toBeInTheDocument()

    await user.click(screen.getByText('View reasoning steps'))
    expect(screen.getByTestId('streamdown')).toBeInTheDocument()
    unmount()

    // Same key after unmount + remount = reasoning still expanded. This is
    // the contract that makes virtualized rows safe to recycle.
    render(<ReasoningComponent {...props} />)
    expect(screen.getByTestId('streamdown')).toBeInTheDocument()
  })
})
