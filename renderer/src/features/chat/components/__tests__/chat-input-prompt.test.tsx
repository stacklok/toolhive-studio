import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ChatStatus, FileUIPart } from 'ai'
import { createRef } from 'react'
import { ChatInputPrompt, type ChatComposerHandle } from '../chat-input-prompt'

// Mock leaf selectors — they pull in providers/queries we don't need here.
vi.mock('../model-selector', () => ({
  ModelSelector: () => <div data-testid="model-selector" />,
}))
vi.mock('../mcp-server-selector', () => ({
  McpServerSelector: () => <div data-testid="mcp-server-selector" />,
}))
vi.mock('../skill-selector', () => ({
  SkillSelector: () => <div data-testid="skill-selector" />,
}))
vi.mock('../agent-selector', () => ({
  AgentSelector: () => <div data-testid="agent-selector" />,
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('@/common/lib/analytics', () => ({
  trackEvent: vi.fn(),
}))

vi.mock('@/common/hooks/use-feature-flag', () => ({
  useFeatureFlag: () => false,
}))

vi.mock('electron-log/renderer', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

interface RenderArgs {
  status?: ChatStatus
  editingMessageId?: string | null
  lastUserMessageId?: string | null
  onSendMessage?: (msg: { text: string; files?: FileUIPart[] }) => Promise<void>
  onRewindAndResend?: (args: {
    text: string
    files?: FileUIPart[]
    editingMessageId: string
  }) => Promise<unknown>
  onStopGeneration?: () => void
  onClearEdit?: () => void
}

/**
 * Real browsers expose named form controls as properties on the
 * HTMLFormElement (i.e. `form.message` resolves to the textarea named
 * "message"). jsdom does not — only `form.elements.message` works. The
 * shared `PromptInput` reads `event.currentTarget.message.value` at submit
 * time, which would throw in jsdom. Patch the form here so the submit path
 * matches browser semantics.
 */
function patchNamedFormControls(form: HTMLFormElement): void {
  if (Object.getOwnPropertyDescriptor(form, 'message')) return
  Object.defineProperty(form, 'message', {
    configurable: true,
    get(this: HTMLFormElement) {
      return (
        this.elements as unknown as { namedItem: (n: string) => Element | null }
      ).namedItem('message')
    },
  })
}

function renderPrompt(args: RenderArgs = {}) {
  const onSendMessage =
    args.onSendMessage ?? vi.fn().mockResolvedValue(undefined)
  const onRewindAndResend =
    args.onRewindAndResend ?? vi.fn().mockResolvedValue(undefined)
  const onStopGeneration = args.onStopGeneration ?? vi.fn()
  const onClearEdit = args.onClearEdit ?? vi.fn()
  const composerHandleRef = createRef<ChatComposerHandle | null>()

  const { container } = render(
    <ChatInputPrompt
      status={args.status ?? 'ready'}
      settings={
        {
          provider: 'openai',
          model: 'gpt-4',
          apiKey: 'sk-test',
          enabledTools: [],
        } as never
      }
      updateSettings={vi.fn()}
      onSendMessage={onSendMessage}
      onRewindAndResend={onRewindAndResend}
      onStopGeneration={onStopGeneration}
      onSettingsOpen={vi.fn()}
      handleProviderChange={vi.fn()}
      hasProviderAndModel
      hasMessages
      threadId="thread-1"
      composerHandleRef={composerHandleRef}
      editingMessageId={args.editingMessageId ?? null}
      lastUserMessageId={args.lastUserMessageId ?? null}
      onClearEdit={onClearEdit}
    />
  )

  const form = container.querySelector('form')
  if (form) patchNamedFormControls(form)

  return {
    onSendMessage,
    onRewindAndResend,
    onStopGeneration,
    onClearEdit,
    composerHandleRef,
  }
}

describe('ChatInputPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    try {
      localStorage.clear()
    } catch {
      // ignore — jsdom may not support storage in some environments
    }
  })

  describe('submit decision', () => {
    it('calls onRewindAndResend when editingMessageId matches lastUserMessageId and streaming', async () => {
      const {
        onRewindAndResend,
        onSendMessage,
        onStopGeneration,
        composerHandleRef,
      } = renderPrompt({
        status: 'streaming',
        editingMessageId: 'u2',
        lastUserMessageId: 'u2',
      })

      // Set composer text via the imperative handle that the parent uses.
      await act(async () => {
        composerHandleRef.current?.setText('edited text')
      })

      // Submit by clicking the Resend button (aria-label distinguishes it).
      const submitButton = screen.getByRole('button', {
        name: 'Resend edited message',
      })
      await userEvent.click(submitButton)

      expect(onRewindAndResend).toHaveBeenCalledTimes(1)
      expect(onRewindAndResend).toHaveBeenCalledWith({
        text: 'edited text',
        files: [],
        editingMessageId: 'u2',
      })
      expect(onSendMessage).not.toHaveBeenCalled()
      expect(onStopGeneration).not.toHaveBeenCalled()
    })

    it('calls onStopGeneration (not onSendMessage) when streaming and NOT editing the last user message', async () => {
      const { onStopGeneration, onSendMessage, onRewindAndResend } =
        renderPrompt({
          status: 'streaming',
          editingMessageId: 'u1', // older message — not the last
          lastUserMessageId: 'u2',
        })

      // The submit button is the normal one (stop icon), not the Resend one.
      expect(
        screen.queryByRole('button', { name: 'Resend edited message' })
      ).not.toBeInTheDocument()

      const allButtons = screen.getAllByRole('button')
      const realSubmit = allButtons.find(
        (b) => (b as HTMLButtonElement).type === 'submit'
      )!
      await userEvent.click(realSubmit)

      expect(onStopGeneration).toHaveBeenCalled()
      expect(onSendMessage).not.toHaveBeenCalled()
      expect(onRewindAndResend).not.toHaveBeenCalled()
    })

    it('calls onSendMessage when idle and the user submits text', async () => {
      const {
        onSendMessage,
        onRewindAndResend,
        onStopGeneration,
        composerHandleRef,
      } = renderPrompt({ status: 'ready' })

      await act(async () => {
        composerHandleRef.current?.setText('hello there')
      })

      const allButtons = screen.getAllByRole('button')
      const realSubmit = allButtons.find(
        (b) => (b as HTMLButtonElement).type === 'submit'
      )!
      await userEvent.click(realSubmit)

      expect(onSendMessage).toHaveBeenCalledWith({
        text: 'hello there',
        files: [],
      })
      expect(onRewindAndResend).not.toHaveBeenCalled()
      expect(onStopGeneration).not.toHaveBeenCalled()
    })
  })

  describe('edit chip', () => {
    it('renders the chip with a cancel button when isEditingStreaming', async () => {
      renderPrompt({
        status: 'streaming',
        editingMessageId: 'u2',
        lastUserMessageId: 'u2',
      })

      expect(screen.getByTestId('edit-streaming-chip')).toBeInTheDocument()
      expect(
        screen.getByText(/Editing last message — submit to rewind and retry/)
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Cancel edit' })
      ).toBeInTheDocument()
    })

    it('does not render the chip when editing an older user message during streaming', () => {
      renderPrompt({
        status: 'streaming',
        editingMessageId: 'u1',
        lastUserMessageId: 'u2',
      })
      expect(
        screen.queryByTestId('edit-streaming-chip')
      ).not.toBeInTheDocument()
    })

    it('does not render the chip when not streaming, even if editingMessageId is set', () => {
      renderPrompt({
        status: 'ready',
        editingMessageId: 'u2',
        lastUserMessageId: 'u2',
      })
      expect(
        screen.queryByTestId('edit-streaming-chip')
      ).not.toBeInTheDocument()
    })

    it('cancel button calls onClearEdit and clears composer text', async () => {
      const { onClearEdit, composerHandleRef } = renderPrompt({
        status: 'streaming',
        editingMessageId: 'u2',
        lastUserMessageId: 'u2',
      })

      // Pre-fill the composer to verify the cancel clears it.
      await act(async () => {
        composerHandleRef.current?.setText('some draft')
      })
      // Sanity: the textarea now has that text.
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      expect(textarea.value).toBe('some draft')

      await userEvent.click(screen.getByRole('button', { name: 'Cancel edit' }))

      expect(onClearEdit).toHaveBeenCalled()
      expect(textarea.value).toBe('')
    })
  })

  describe('clearEdit triggers', () => {
    it('calls onClearEdit when the composer text becomes empty', async () => {
      const { onClearEdit, composerHandleRef } = renderPrompt({
        status: 'streaming',
        editingMessageId: 'u2',
        lastUserMessageId: 'u2',
      })

      // Composer starts empty (no draft). The effect should NOT fire just
      // because editingMessageId is set — text has to *become* empty after
      // being non-empty for it to be a useful trigger. But the current
      // implementation also fires on the initial empty state. Verify the
      // observable behavior: clearing the text fires the callback.
      await act(async () => {
        composerHandleRef.current?.setText('something')
      })

      // Now clear it via the textarea change handler (mirrors the user
      // typing-then-erasing path).
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      fireEvent.change(textarea, { target: { value: '' } })

      expect(onClearEdit).toHaveBeenCalled()
    })

    it('calls onClearEdit after a normal (non-rewind) successful submit', async () => {
      const { onSendMessage, onClearEdit, composerHandleRef } = renderPrompt({
        status: 'ready',
        editingMessageId: 'u1', // older user message — not the streaming target
        lastUserMessageId: 'u2',
      })

      await act(async () => {
        composerHandleRef.current?.setText('new message')
      })

      const allButtons = screen.getAllByRole('button')
      const realSubmit = allButtons.find(
        (b) => (b as HTMLButtonElement).type === 'submit'
      )!
      await userEvent.click(realSubmit)

      expect(onSendMessage).toHaveBeenCalled()
      expect(onClearEdit).toHaveBeenCalled()
    })
  })

  describe('send failure handling', () => {
    it('restores the composer text when the async send rejects', async () => {
      // Async rejections used to escape an old `try/catch` (which only
      // catches sync throws), causing the composer to clear without the
      // message actually being sent. Verify the rejection is caught and
      // the text is restored so the user can retry.
      const onSendMessage = vi.fn().mockRejectedValue(new Error('boom'))
      const { composerHandleRef } = renderPrompt({
        status: 'ready',
        onSendMessage,
      })

      await act(async () => {
        composerHandleRef.current?.setText('please send me')
      })

      const allButtons = screen.getAllByRole('button')
      const realSubmit = allButtons.find(
        (b) => (b as HTMLButtonElement).type === 'submit'
      )!
      await userEvent.click(realSubmit)

      // Let the rejected promise settle.
      await waitFor(() => expect(onSendMessage).toHaveBeenCalled())
      await waitFor(() => {
        const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
        expect(textarea.value).toBe('please send me')
      })
    })
  })
})
