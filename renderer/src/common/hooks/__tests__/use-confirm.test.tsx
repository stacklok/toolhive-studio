import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useConfirm } from '../use-confirm'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import { type ReactNode, useState } from 'react'
import { type ConfirmConfig } from '@/common/confirm'

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
  it('does not show checkbox when doNotShowAgain is not provided', async () => {
    const TestComponent = createTestComponent('Continue with this action?', {
      title: 'Confirm Action',
      buttons: { yes: 'Continue', no: 'Cancel' },
    })

    render(
      <PromptProvider>
        <TestComponent />
      </PromptProvider>
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Trigger Confirm' })
    )

    await waitFor(() => {
      expect(screen.getByText('Confirm Action')).toBeVisible()
    })
    expect(screen.getByText('Continue with this action?')).toBeVisible()

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

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
      <PromptProvider>
        <TestComponent />
      </PromptProvider>
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Trigger Confirm' })
    )

    await waitFor(() => {
      expect(screen.getByText('Confirm Deletion')).toBeVisible()
    })
    expect(screen.getByText('This action cannot be undone.')).toBeVisible()
    expect(
      screen.getByText('Are you sure you want to delete this item?')
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeVisible()

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Result: true')
    })

    expect(screen.queryByText('Confirm Deletion')).not.toBeInTheDocument()
  })

  it('shows confirmation dialog and resolves promise when user clicks No', async () => {
    const TestComponent = createTestComponent('Do you want to save changes?', {
      title: 'Save Changes',
      description: 'You have unsaved changes.',
      buttons: { yes: 'Save', no: 'Discard' },
    })

    render(
      <PromptProvider>
        <TestComponent />
      </PromptProvider>
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Trigger Confirm' })
    )

    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeVisible()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Discard' }))

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Result: false')
    })

    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument()
  })

  it('shows checkbox when doNotShowAgain option is provided', async () => {
    const TestComponent = createTestComponent('Delete this file?', {
      title: 'Confirm Deletion',
      buttons: { yes: 'Delete', no: 'Cancel' },
      doNotShowAgain: {
        label: 'Do not warn me again',
        id: 'test_feature_1',
      },
    })

    render(
      <PromptProvider>
        <TestComponent />
      </PromptProvider>
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Trigger Confirm' })
    )

    await waitFor(() => {
      expect(screen.getByText('Confirm Deletion')).toBeVisible()
    })
    expect(screen.getByText('Delete this file?')).toBeVisible()
    expect(
      screen.getByRole('checkbox', { name: 'Do not warn me again' })
    ).toBeVisible()
  })

  it('saves doNotShowAgain choice to localStorage when checkbox is checked', async () => {
    localStorage.clear()

    const TestComponent = createTestComponent('Are you sure?', {
      title: 'Confirm Action',
      buttons: { yes: 'Yes', no: 'No' },
      doNotShowAgain: {
        label: 'Remember my choice',
        id: 'test_feature_2',
      },
    })

    render(
      <PromptProvider>
        <TestComponent />
      </PromptProvider>
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Trigger Confirm' })
    )

    await waitFor(() => {
      expect(screen.getByText('Confirm Action')).toBeVisible()
    })

    const checkbox = screen.getByRole('checkbox', {
      name: 'Remember my choice',
    })
    await userEvent.click(checkbox)

    await userEvent.click(screen.getByRole('button', { name: 'Yes' }))

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Result: true')
    })

    expect(localStorage.getItem('doNotShowAgain_test_feature_2')).toBe('true')
  })

  it('skips dialog and returns true when doNotShowAgain choice exists', async () => {
    localStorage.setItem('doNotShowAgain_test_feature_3', 'true')

    const TestComponent = createTestComponent('Continue with action?', {
      title: 'Confirm Continue',
      buttons: { yes: 'Continue', no: 'Stop' },
      doNotShowAgain: {
        label: 'Remember this choice',
        id: 'test_feature_3',
      },
    })

    render(
      <PromptProvider>
        <TestComponent />
      </PromptProvider>
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Trigger Confirm' })
    )

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Result: true')
    })

    expect(screen.queryByText('Confirm Continue')).not.toBeInTheDocument()
    expect(screen.queryByText('Continue with action?')).not.toBeInTheDocument()
  })

  it('does not save to localStorage when checkbox is unchecked', async () => {
    localStorage.clear()

    const TestComponent = createTestComponent('Proceed?', {
      title: 'Confirm Proceed',
      buttons: { yes: 'Proceed', no: 'Cancel' },
      doNotShowAgain: {
        label: 'Do not ask again',
        id: 'test_feature_4',
      },
    })

    render(
      <PromptProvider>
        <TestComponent />
      </PromptProvider>
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Trigger Confirm' })
    )

    await waitFor(() => {
      expect(screen.getByText('Confirm Proceed')).toBeVisible()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Proceed' }))

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Result: true')
    })

    expect(localStorage.getItem('doNotShowAgain_test_feature_4')).toBeNull()
  })

  it('does not save to localStorage when user checks doNotShowAgain but clicks No', async () => {
    localStorage.clear()

    const TestComponent = createTestComponent('Delete this file?', {
      title: 'Confirm Deletion',
      buttons: { yes: 'Delete', no: 'Cancel' },
      doNotShowAgain: {
        label: 'Remember my choice',
        id: 'test_feature_5',
      },
    })

    render(
      <PromptProvider>
        <TestComponent />
      </PromptProvider>
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Trigger Confirm' })
    )

    await waitFor(() => {
      expect(screen.getByText('Confirm Deletion')).toBeVisible()
    })

    const checkbox = screen.getByRole('checkbox', {
      name: 'Remember my choice',
    })
    await userEvent.click(checkbox)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Result: false')
    })

    expect(localStorage.getItem('doNotShowAgain_test_feature_5')).toBeNull()
  })
})
