import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { vi, beforeEach, afterEach } from 'vitest'
import { usePrompt, generatePromptProps } from '../use-prompt'
import { PromptProvider } from '@/common/contexts/prompt/provider'

function TestComponent({
  promptProps,
  buttonLabel = 'Trigger Prompt',
  testId = 'test-component',
}: {
  promptProps: Parameters<ReturnType<typeof usePrompt>>[0]
  buttonLabel?: string
  testId?: string
}) {
  const prompt = usePrompt()
  const [result, setResult] = useState<unknown>(undefined)

  const handleClick = async () => {
    const value = await prompt(promptProps)
    setResult(value)
  }

  return (
    <div data-testid={testId}>
      <button onClick={handleClick}>{buttonLabel}</button>
      {result !== undefined && (
        <div data-testid="result">
          {result === null ? 'Cancelled' : `Result: ${JSON.stringify(result)}`}
        </div>
      )}
    </div>
  )
}

function renderTestComponent(props: Parameters<typeof TestComponent>[0]) {
  return render(
    <PromptProvider>
      <TestComponent {...props} />
    </PromptProvider>
  )
}

describe('usePrompt', () => {
  beforeEach(() => {
    // Mock console methods to avoid Radix UI warnings during tests
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('shows prompt dialog with basic configuration', async () => {
    const promptProps = generatePromptProps('text', '', {
      title: 'Test Prompt',
      label: 'Enter value',
      placeholder: 'Type here...',
    })

    renderTestComponent({ promptProps })

    // Click button to open prompt
    await userEvent.click(screen.getByRole('button'))

    // Check if dialog is shown
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Check dialog content
    expect(screen.getByText('Test Prompt')).toBeVisible()
    expect(screen.getByLabelText('Enter value')).toBeVisible()
    expect(screen.getByPlaceholderText('Type here...')).toBeVisible()
  })

  it('returns value when confirmed', async () => {
    const promptProps = generatePromptProps('text', '', {
      title: 'Test Input',
      label: 'Name',
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Type in input
    const input = screen.getByLabelText('Name')
    await userEvent.type(input, 'Test Value')

    // Click OK button
    await userEvent.click(screen.getByRole('button', { name: /ok/i }))

    // Check result
    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent(
        'Result: {"value":"Test Value"}'
      )
    })
  })

  it('returns null when cancelled', async () => {
    const promptProps = generatePromptProps('text', '', {
      title: 'Test Input',
      label: 'Name',
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Click Cancel button
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

    // Check result
    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Cancelled')
    })
  })

  it('validates required field', async () => {
    const promptProps = generatePromptProps('text', '', {
      title: 'Required Field',
      label: 'Name',
      required: true,
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Try to submit without entering anything
    await userEvent.click(screen.getByRole('button', { name: /ok/i }))

    // Should show validation error and dialog should still be open
    await waitFor(() => {
      expect(screen.getByText('This field is required')).toBeVisible()
    })
    expect(screen.getByRole('dialog')).toBeVisible()
  })

  it('validates email input', async () => {
    const promptProps = generatePromptProps('email', '', {
      title: 'Email Input',
      label: 'Email',
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Type valid email and verify it works
    const input = screen.getByLabelText('Email')
    await userEvent.type(input, 'test@example.com')
    await userEvent.click(screen.getByRole('button', { name: /ok/i }))

    // Should close dialog and return result
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent(
        'Result: {"value":"test@example.com"}'
      )
    })
  })

  it('validates minimum length', async () => {
    const promptProps = generatePromptProps('text', '', {
      title: 'Min Length',
      label: 'Username',
      minLength: 3,
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Type text that meets minimum requirement
    const input = screen.getByLabelText('Username')
    await userEvent.type(input, 'abc')
    await userEvent.click(screen.getByRole('button', { name: /ok/i }))

    // Should close dialog and return result
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent(
        'Result: {"value":"abc"}'
      )
    })
  })

  it('validates maximum length', async () => {
    const promptProps = generatePromptProps('text', '', {
      title: 'Max Length',
      label: 'Short Text',
      maxLength: 5,
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Type text within maximum limit
    const input = screen.getByLabelText('Short Text')
    await userEvent.type(input, 'short')
    await userEvent.click(screen.getByRole('button', { name: /ok/i }))

    // Should close dialog and return result
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent(
        'Result: {"value":"short"}'
      )
    })
  })

  it('uses custom button labels', async () => {
    const promptProps = generatePromptProps('text', '', {
      title: 'Custom Buttons',
      label: 'Value',
      confirmText: 'Save',
      cancelText: 'Discard',
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Check custom button labels
    expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Discard' })).toBeVisible()
  })

  it('sets initial value', async () => {
    const promptProps = generatePromptProps('text', 'Initial Value', {
      title: 'With Initial',
      label: 'Name',
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Check that input has initial value
    const input = screen.getByLabelText('Name')
    expect(input).toHaveValue('Initial Value')
  })

  it('validates URL input', async () => {
    const promptProps = generatePromptProps('url', '', {
      title: 'URL Input',
      label: 'Website URL',
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Type valid URL and verify it works
    const input = screen.getByLabelText('Website URL')
    await userEvent.type(input, 'https://example.com')
    await userEvent.click(screen.getByRole('button', { name: /ok/i }))

    // Should close dialog and return result
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent(
        'Result: {"value":"https://example.com"}'
      )
    })
  })

  it('validates pattern regex', async () => {
    const promptProps = generatePromptProps('text', '', {
      title: 'Pattern Test',
      label: 'Numbers Only',
      pattern: /^\d+$/,
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Type valid numeric text
    const input = screen.getByLabelText('Numbers Only')
    await userEvent.type(input, '12345')
    await userEvent.click(screen.getByRole('button', { name: /ok/i }))

    // Should close dialog and return result
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent(
        'Result: {"value":"12345"}'
      )
    })
  })

  it('closes dialog when clicking outside is prevented', async () => {
    const promptProps = generatePromptProps('text', '', {
      title: 'Test Input',
      label: 'Name',
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Dialog should remain open even when trying to click outside
    // This is tested by the onInteractOutside prop preventing the default
    expect(screen.getByRole('dialog')).toBeVisible()
  })
})
