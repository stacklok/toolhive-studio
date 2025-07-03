import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useConfirm } from '../use-confirm'
import { ConfirmProvider } from '@/common/contexts/confirm/provider'
import { type ReactNode, useState } from 'react'
import { type ConfirmConfig } from '@/common/contexts/confirm'

// Factory function to create test components with different configurations
const createTestComponent = (
  message: ReactNode,
  config: ConfirmConfig,
  buttonLabel = 'Trigger Confirm'
) => {
  return function TestComponent() {
    const confirm = useConfirm()
    const [result, setResult] = useState<boolean | null>(null)

    const handleClick = async () => {
      const confirmed = await confirm(message, config)
      setResult(confirmed)
    }

    return (
      <div>
        <button onClick={handleClick}>{buttonLabel}</button>
        {result !== null && (
          <div data-testid="result">Result: {result.toString()}</div>
        )}
      </div>
    )
  }
}

describe('useConfirm', () => {
  it('shows confirmation dialog and resolves promise when user clicks Yes', async () => {
    const TestComponent = createTestComponent(
      'Are you sure you want to delete this item?',
      {
        title: 'Confirm Deletion',
        description: 'This action cannot be undone.',
        buttons: { yes: 'Delete', no: 'Cancel' },
        isDestructive: true,
      }
    )

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
    const TestComponent = createTestComponent('Do you want to save changes?', {
      title: 'Save Changes',
      description: 'You have unsaved changes.',
      buttons: { yes: 'Save', no: 'Discard' },
    })

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
