import {
  renderHook,
  act,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { useConfirm } from '../use-confirm'
import { ConfirmProvider } from '@/common/contexts/confirm/provider'
import { type ReactNode, useState } from 'react'

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

  // Integration test that actually interacts with the UI
  it('shows confirmation dialog and resolves promise when user clicks Yes', async () => {
    // Test component that uses the hook
    function TestComponent() {
      const confirm = useConfirm()
      const [result, setResult] = useState<boolean | null>(null)

      const handleClick = async () => {
        const confirmed = await confirm(
          'Are you sure you want to delete this item?',
          {
            title: 'Confirm Deletion',
            description: 'This action cannot be undone.',
            buttons: { yes: 'Delete', no: 'Cancel' },
            isDestructive: true,
          }
        )
        setResult(confirmed)
      }

      return (
        <div>
          <button onClick={handleClick}>Trigger Confirm</button>
          {result !== null && (
            <div data-testid="result">Result: {result.toString()}</div>
          )}
        </div>
      )
    }

    render(
      <ConfirmProvider>
        <TestComponent />
      </ConfirmProvider>
    )

    // Click the trigger button
    await userEvent.click(
      screen.getByRole('button', { name: 'Trigger Confirm' })
    )

    // Verify dialog appears with correct content
    await waitFor(() => {
      expect(screen.getByText('Confirm Deletion')).toBeVisible()
    })
    expect(screen.getByText('This action cannot be undone.')).toBeVisible()
    expect(
      screen.getByText('Are you sure you want to delete this item?')
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeVisible()

    // Click Yes button
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    // Verify promise resolved to true
    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Result: true')
    })

    // Verify dialog is closed
    expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument()
  })

  it('shows confirmation dialog and resolves promise when user clicks No', async () => {
    // Test component that uses the hook
    function TestComponent() {
      const confirm = useConfirm()
      const [result, setResult] = useState<boolean | null>(null)

      const handleClick = async () => {
        const confirmed = await confirm('Do you want to save changes?', {
          title: 'Save Changes',
          description: 'You have unsaved changes.',
          buttons: { yes: 'Save', no: 'Discard' },
        })
        setResult(confirmed)
      }

      return (
        <div>
          <button onClick={handleClick}>Trigger Confirm</button>
          {result !== null && (
            <div data-testid="result">Result: {result.toString()}</div>
          )}
        </div>
      )
    }

    render(
      <ConfirmProvider>
        <TestComponent />
      </ConfirmProvider>
    )

    // Click the trigger button
    await userEvent.click(
      screen.getByRole('button', { name: 'Trigger Confirm' })
    )

    // Verify dialog appears
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeVisible()
    })

    // Click No button
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }))

    // Verify promise resolved to false
    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Result: false')
    })

    // Verify dialog is closed
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument()
  })
})
