import { describe, it, expect, beforeEach } from 'vitest'
import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { _resetDisclosureStore, useDisclosure } from '../disclosure-store'

beforeEach(() => {
  _resetDisclosureStore()
})

describe('useDisclosure', () => {
  it('defaults to false for an unseen key', () => {
    const { result } = renderHook(() => useDisclosure('a'))
    const [isOpen] = result.current
    expect(isOpen).toBe(false)
  })

  it('toggles the value for a key in place', () => {
    const { result } = renderHook(() => useDisclosure('a'))
    expect(result.current[0]).toBe(false)

    act(() => result.current[1]())
    expect(result.current[0]).toBe(true)

    act(() => result.current[1]())
    expect(result.current[0]).toBe(false)
  })

  it('isolates keys: toggling one does not affect siblings', () => {
    const { result: a } = renderHook(() => useDisclosure('a'))
    const { result: b } = renderHook(() => useDisclosure('b'))

    act(() => a.current[1]())

    expect(a.current[0]).toBe(true)
    expect(b.current[0]).toBe(false)
  })

  it('persists state across unmount + remount of the same key', () => {
    function Probe({ k }: { k: string }) {
      const [isOpen, toggle] = useDisclosure(k)
      return <button onClick={toggle}>{isOpen ? 'open' : 'closed'}</button>
    }

    const { unmount } = render(<Probe k="shared" />)
    expect(screen.getByRole('button')).toHaveTextContent('closed')

    return userEvent
      .setup()
      .click(screen.getByRole('button'))
      .then(() => {
        expect(screen.getByRole('button')).toHaveTextContent('open')
        unmount()

        render(<Probe k="shared" />)
        // Same key after a full unmount/remount cycle returns to `open`,
        // simulating a virtualized row scrolling out and back into view.
        expect(screen.getByRole('button')).toHaveTextContent('open')
      })
  })

  it('two consumers of the same key see updates synchronously', () => {
    function Reader({ k }: { k: string }) {
      const [isOpen] = useDisclosure(k)
      return <span data-testid="read">{isOpen ? 'open' : 'closed'}</span>
    }
    function Writer({ k }: { k: string }) {
      const [, toggle] = useDisclosure(k)
      return <button onClick={toggle}>toggle</button>
    }

    render(
      <>
        <Reader k="z" />
        <Writer k="z" />
      </>
    )
    expect(screen.getByTestId('read')).toHaveTextContent('closed')

    return userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'toggle' }))
      .then(() => {
        expect(screen.getByTestId('read')).toHaveTextContent('open')
      })
  })
})
