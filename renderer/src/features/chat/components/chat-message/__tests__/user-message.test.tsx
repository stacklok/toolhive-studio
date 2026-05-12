import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import type { ChatUIMessage } from '../../../types'
import { UserMessage } from '../user-message'
import {
  ChatComposerProvider,
  type ChatComposerContextValue,
} from '../../chat-composer-context'

vi.mock('streamdown', () => ({
  Streamdown: ({ children }: { children: ReactNode }) => (
    <div data-testid="streamdown">{children}</div>
  ),
}))
vi.mock('@streamdown/code', () => ({ code: {} }))
vi.mock('@streamdown/mermaid', () => ({ mermaid: {} }))
vi.mock('@streamdown/cjk', () => ({ cjk: {} }))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const writeText = vi.fn()
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText },
  writable: true,
  configurable: true,
})

function userMessage(text: string): ChatUIMessage {
  return {
    id: 'm-1',
    role: 'user',
    parts: [{ type: 'text', text }],
  } as unknown as ChatUIMessage
}

describe('UserMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    writeText.mockResolvedValue(undefined)
  })

  it('shows an Edit button that drives the composer via the provider', async () => {
    const setDraftText = vi.fn()
    const focusComposer = vi.fn()
    const value: ChatComposerContextValue = { setDraftText, focusComposer }

    render(
      <ChatComposerProvider value={value}>
        <UserMessage message={userMessage('hello world')} status="ready" />
      </ChatComposerProvider>
    )

    const editButton = screen.getByRole('button', { name: 'Edit message' })
    await userEvent.click(editButton)

    expect(setDraftText).toHaveBeenCalledTimes(1)
    expect(setDraftText).toHaveBeenCalledWith('hello world')
    expect(focusComposer).toHaveBeenCalledTimes(1)
  })

  it('does not render an Edit button when no composer provider is in the tree', () => {
    render(<UserMessage message={userMessage('hello world')} status="ready" />)
    expect(
      screen.queryByRole('button', { name: /edit message/i })
    ).not.toBeInTheDocument()
    // Copy is still available regardless.
    expect(
      screen.getByRole('button', { name: 'Copy message' })
    ).toBeInTheDocument()
  })

  it('omits the Edit button when the message has no extractable text', () => {
    const attachmentOnly = {
      id: 'm-2',
      role: 'user',
      parts: [{ type: 'file', mediaType: 'image/png', url: 'blob:x' }],
    } as unknown as ChatUIMessage

    const value: ChatComposerContextValue = {
      setDraftText: vi.fn(),
      focusComposer: vi.fn(),
    }

    render(
      <ChatComposerProvider value={value}>
        <UserMessage message={attachmentOnly} status="ready" />
      </ChatComposerProvider>
    )

    // No copy text → entire MessageActions block is skipped, so neither
    // button renders.
    expect(
      screen.queryByRole('button', { name: /edit message/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /copy message/i })
    ).not.toBeInTheDocument()
  })
})
