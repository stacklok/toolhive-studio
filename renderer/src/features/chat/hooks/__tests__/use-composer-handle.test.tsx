import { describe, it, expect, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { createRef, useRef } from 'react'
import { useComposerHandle } from '../use-composer-handle'
import type { ChatComposerHandle } from '../../components/chat-input-prompt'

interface ProbeProps {
  composerHandleRef: ReturnType<typeof createRef<ChatComposerHandle | null>>
  setText: (text: string) => void
  initialValue?: string
}

function Probe({ composerHandleRef, setText, initialValue = '' }: ProbeProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  useComposerHandle(composerHandleRef, setText, textareaRef)
  return (
    <textarea
      ref={textareaRef}
      data-testid="probe-textarea"
      defaultValue={initialValue}
    />
  )
}

describe('useComposerHandle', () => {
  it('registers setText on the ref so callers can drive the draft', () => {
    const composerHandleRef = createRef<ChatComposerHandle | null>()
    const setText = vi.fn()

    render(<Probe composerHandleRef={composerHandleRef} setText={setText} />)

    expect(composerHandleRef.current).not.toBeNull()
    act(() => {
      composerHandleRef.current?.setText('hello')
    })
    expect(setText).toHaveBeenCalledWith('hello')
  })

  it('focusTextarea focuses the textarea and moves the caret to the end', () => {
    const composerHandleRef = createRef<ChatComposerHandle | null>()
    const setText = vi.fn()

    const { getByTestId } = render(
      <Probe
        composerHandleRef={composerHandleRef}
        setText={setText}
        initialValue="abcdef"
      />
    )

    const textarea = getByTestId('probe-textarea') as HTMLTextAreaElement
    act(() => {
      composerHandleRef.current?.focusTextarea()
    })

    expect(document.activeElement).toBe(textarea)
    const end = textarea.value.length
    expect(textarea.selectionStart).toBe(end)
    expect(textarea.selectionEnd).toBe(end)
  })

  it('clears the ref on unmount', () => {
    const composerHandleRef = createRef<ChatComposerHandle | null>()
    const setText = vi.fn()

    const { unmount } = render(
      <Probe composerHandleRef={composerHandleRef} setText={setText} />
    )

    expect(composerHandleRef.current).not.toBeNull()
    unmount()
    expect(composerHandleRef.current).toBeNull()
  })

  it('does nothing when composerHandleRef is undefined', () => {
    // Smoke test — the hook should be safe to call without a ref, so the
    // composer can be used in trees that don't need imperative access.
    function NoRefProbe() {
      const textareaRef = useRef<HTMLTextAreaElement | null>(null)
      useComposerHandle(undefined, vi.fn(), textareaRef)
      return <textarea ref={textareaRef} />
    }
    expect(() => render(<NoRefProbe />)).not.toThrow()
  })
})
