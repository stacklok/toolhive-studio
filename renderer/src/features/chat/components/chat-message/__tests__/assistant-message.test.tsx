import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ChatUIMessage } from '../../../types'
import { AssistantMessage } from '../assistant-message'

vi.mock('../token-usage', () => ({
  TokenUsage: () => <div data-testid="token-usage" />,
}))
vi.mock('../joined-assistant-text', () => ({
  JoinedAssistantText: () => null,
}))
vi.mock('../no-content-message', () => ({
  NoContentMessage: () => null,
}))
vi.mock('../message-actions', () => ({
  MessageActions: () => null,
}))

function makeMessage(parts: ChatUIMessage['parts']): ChatUIMessage {
  return {
    id: 'msg-1',
    role: 'assistant',
    parts,
    metadata: {
      createdAt: Date.now(),
      model: 'gpt-4o',
      providerId: 'openai',
    },
  }
}

describe('AssistantMessage', () => {
  it('renders reasoning-file parts like regular file parts', () => {
    render(
      <AssistantMessage
        message={makeMessage([
          {
            type: 'reasoning-file',
            name: 'trace.pdf',
            url: 'https://example.com/trace.pdf',
            mediaType: 'application/pdf',
          } as unknown as ChatUIMessage['parts'][0],
        ])}
        status="ready"
        toolUiMetadata={{}}
      />
    )

    expect(screen.getByText('File: trace.pdf')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
      'href',
      'https://example.com/trace.pdf'
    )
  })
})
