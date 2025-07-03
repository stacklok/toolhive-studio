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

  it('shows checkbox when doNotShowAgain option is provided', async () => {
    const TestComponent = createTestComponent('Delete this file?', {
      title: 'Confirm Deletion',
      buttons: { yes: 'Delete', no: 'Cancel' },
      // @ts-expect-error - doNotShowAgain feature not implemented yet
      doNotShowAgain: {
        label: 'Do not warn me again',
        id: 'test_feature_1',
      },
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

    // Verify dialog appears with checkbox
    await waitFor(() => {
      expect(screen.getByText('Confirm Deletion')).toBeVisible()
    })
    expect(screen.getByText('Delete this file?')).toBeVisible()
    expect(
      screen.getByRole('checkbox', { name: 'Do not warn me again' })
    ).toBeVisible()
  })

  it('saves doNotShowAgain choice to localStorage when checkbox is checked', async () => {
    // Clear localStorage before test
    localStorage.clear()

    const TestComponent = createTestComponent('Are you sure?', {
      title: 'Confirm Action',
      buttons: { yes: 'Yes', no: 'No' },
      // @ts-expect-error - doNotShowAgain feature not implemented yet
      doNotShowAgain: {
        label: 'Remember my choice',
        id: 'test_feature_2',
      },
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

    // Wait for dialog and check the checkbox
    await waitFor(() => {
      expect(screen.getByText('Confirm Action')).toBeVisible()
    })

    const checkbox = screen.getByRole('checkbox', {
      name: 'Remember my choice',
    })
    await userEvent.click(checkbox)

    // Click Yes button
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }))

    // Verify result and localStorage
    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Result: true')
    })

    // Check that the choice was saved to localStorage
    expect(localStorage.getItem('doNotShowAgain_test_feature_2')).toBe('true')
  })

  it('skips dialog and returns true when doNotShowAgain choice exists', async () => {
    // Pre-populate localStorage with a saved "proceed" choice
    localStorage.setItem('doNotShowAgain_test_feature_3', 'true')

    const TestComponent = createTestComponent('Continue with action?', {
      title: 'Confirm Continue',
      buttons: { yes: 'Continue', no: 'Stop' },
      // @ts-expect-error - doNotShowAgain feature not implemented yet
      doNotShowAgain: {
        label: 'Remember this choice',
        id: 'test_feature_3',
      },
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

    // Dialog should not appear, result should be true immediately
    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Result: true')
    })

    // Verify dialog never appeared
    expect(screen.queryByText('Confirm Continue')).not.toBeInTheDocument()
    expect(screen.queryByText('Continue with action?')).not.toBeInTheDocument()
  })

  it('does not save to localStorage when checkbox is unchecked', async () => {
    // Clear localStorage before test
    localStorage.clear()

    const TestComponent = createTestComponent('Proceed?', {
      title: 'Confirm Proceed',
      buttons: { yes: 'Proceed', no: 'Cancel' },
      // @ts-expect-error - doNotShowAgain feature not implemented yet
      doNotShowAgain: {
        label: 'Do not ask again',
        id: 'test_feature_4',
      },
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

    // Wait for dialog (checkbox should be unchecked by default)
    await waitFor(() => {
      expect(screen.getByText('Confirm Proceed')).toBeVisible()
    })

    // Click Yes button without checking the checkbox
    await userEvent.click(screen.getByRole('button', { name: 'Proceed' }))

    // Verify result
    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Result: true')
    })

    // Check that nothing was saved to localStorage
    expect(localStorage.getItem('doNotShowAgain_test_feature_4')).toBeNull()
  })
})
