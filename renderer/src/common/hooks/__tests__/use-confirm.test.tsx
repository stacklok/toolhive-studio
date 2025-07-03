import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useConfirm } from '../use-confirm'
import { ConfirmProvider } from '@/common/contexts/confirm/provider'
import { type ReactNode } from 'react'

// Simple wrapper component for testing
const TestWrapper = ({ children }: { children: ReactNode }) => {
  return <ConfirmProvider>{children}</ConfirmProvider>
}

describe('useConfirm', () => {
  it('returns confirm function when used within ConfirmProvider', () => {
    const { result } = renderHook(() => useConfirm(), {
      wrapper: TestWrapper,
    })

    expect(result.current).toBeInstanceOf(Function)
    expect(typeof result.current).toBe('function')
  })

  it('throws error when used outside of ConfirmProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useConfirm())
    }).toThrow('useConfirm must be used within a ConfirmProvider')

    consoleError.mockRestore()
  })

  it('returns a function that can be called and returns a promise', () => {
    const { result } = renderHook(() => useConfirm(), {
      wrapper: TestWrapper,
    })

    const confirm = result.current
    let confirmResult: Promise<boolean>

    act(() => {
      confirmResult = confirm('Test message', {
        buttons: { yes: 'Yes', no: 'No' },
        title: 'Test Title',
      })
    })

    expect(confirmResult!).toBeInstanceOf(Promise)
  })
})
