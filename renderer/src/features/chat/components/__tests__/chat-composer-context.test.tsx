import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  ChatComposerProvider,
  useChatComposer,
  type ChatComposerContextValue,
} from '../chat-composer-context'

function Consumer() {
  const composer = useChatComposer()
  if (!composer) {
    return <div data-testid="no-provider">no provider</div>
  }
  return (
    <button
      type="button"
      onClick={() => {
        composer.setDraftText('hi')
        composer.focusComposer()
      }}
    >
      trigger
    </button>
  )
}

describe('ChatComposerContext', () => {
  it('calls provider setters when the consumer invokes them', async () => {
    const setDraftText = vi.fn()
    const focusComposer = vi.fn()
    const value: ChatComposerContextValue = {
      setDraftText,
      focusComposer,
      editingMessageId: null,
      beginEdit: vi.fn(),
      clearEdit: vi.fn(),
    }

    render(
      <ChatComposerProvider value={value}>
        <Consumer />
      </ChatComposerProvider>
    )

    await userEvent.click(screen.getByRole('button', { name: 'trigger' }))

    expect(setDraftText).toHaveBeenCalledTimes(1)
    expect(setDraftText).toHaveBeenCalledWith('hi')
    expect(focusComposer).toHaveBeenCalledTimes(1)
  })

  it('returns null when rendered outside a provider so consumers can degrade', () => {
    render(<Consumer />)
    expect(screen.getByTestId('no-provider')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'trigger' })).toBeNull()
  })
})
