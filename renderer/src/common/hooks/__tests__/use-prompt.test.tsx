import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { vi, beforeEach, afterEach } from 'vitest'
import { usePrompt, generateSimplePrompt } from '../use-prompt'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import { z } from 'zod/v4'

function TestComponent({
  promptProps,
  buttonLabel = 'Trigger Prompt',
  testId = 'test-component',
}: {
  promptProps: ReturnType<typeof generateSimplePrompt>
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
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('shows prompt dialog with basic configuration', async () => {
    const promptProps = generateSimplePrompt({
      inputType: 'text',
      initialValue: '',
      title: 'Test Prompt',
      placeholder: 'Type here...',
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    expect(screen.getByText('Test Prompt')).toBeVisible()
    expect(screen.getByLabelText('Value')).toBeVisible()
    expect(screen.getByPlaceholderText('Type here...')).toBeVisible()
  })

  it('returns value when confirmed', async () => {
    const promptProps = generateSimplePrompt({
      inputType: 'text',
      initialValue: '',
      title: 'Test Input',
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    const input = screen.getByLabelText('Value')
    await userEvent.type(input, 'Test Value')

    await userEvent.click(screen.getByRole('button', { name: /ok/i }))

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent(
        'Result: {"value":"Test Value"}'
      )
    })
  })

  it('returns null when cancelled', async () => {
    const promptProps = generateSimplePrompt({
      inputType: 'text',
      initialValue: '',
      title: 'Test Input',
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Cancelled')
    })
  })

  it('shows prompt dialog with required field', async () => {
    const promptProps = generateSimplePrompt({
      inputType: 'text',
      initialValue: '',
      title: 'Required Field',
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    expect(screen.getByText('Required Field')).toBeVisible()
    expect(screen.getByLabelText('Value')).toBeVisible()
  })

  it('handles email input', async () => {
    const promptProps = generateSimplePrompt({
      inputType: 'email',
      initialValue: '',
      title: 'Email Input',
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    const input = screen.getByLabelText('Value')
    await userEvent.type(input, 'test@example.com')
    await userEvent.click(screen.getByRole('button', { name: /ok/i }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent(
        'Result: {"value":"test@example.com"}'
      )
    })
  })

  it('handles text input', async () => {
    const promptProps = generateSimplePrompt({
      inputType: 'text',
      initialValue: '',
      title: 'Text Input',
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    const input = screen.getByLabelText('Value')
    await userEvent.type(input, 'test value')
    await userEvent.click(screen.getByRole('button', { name: /ok/i }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent(
        'Result: {"value":"test value"}'
      )
    })
  })

  it('handles password input', async () => {
    const promptProps = generateSimplePrompt({
      inputType: 'password',
      initialValue: '',
      title: 'Password Input',
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    const input = screen.getByLabelText('Value')
    await userEvent.type(input, 'secret123')
    await userEvent.click(screen.getByRole('button', { name: /ok/i }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent(
        'Result: {"value":"secret123"}'
      )
    })
  })

  it('uses default button labels', async () => {
    const promptProps = generateSimplePrompt({
      inputType: 'text',
      initialValue: '',
      title: 'Default Buttons',
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    expect(screen.getByRole('button', { name: 'OK' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeVisible()
  })

  it('sets initial value', async () => {
    const promptProps = generateSimplePrompt({
      inputType: 'text',
      initialValue: 'Initial Value',
      title: 'With Initial',
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    const input = screen.getByLabelText('Value')
    expect(input).toHaveValue('Initial Value')
  })

  it('handles URL input', async () => {
    const promptProps = generateSimplePrompt({
      inputType: 'url',
      initialValue: '',
      title: 'URL Input',
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    const input = screen.getByLabelText('Value')
    await userEvent.type(input, 'https://example.com')
    await userEvent.click(screen.getByRole('button', { name: /ok/i }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent(
        'Result: {"value":"https://example.com"}'
      )
    })
  })

  it('handles numeric input', async () => {
    const promptProps = generateSimplePrompt({
      inputType: 'text',
      initialValue: '',
      title: 'Numeric Input',
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    const input = screen.getByLabelText('Value')
    await userEvent.type(input, '12345')
    await userEvent.click(screen.getByRole('button', { name: /ok/i }))

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
    const promptProps = generateSimplePrompt({
      inputType: 'text',
      initialValue: '',
      title: 'Test Input',
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    expect(screen.getByRole('dialog')).toBeVisible()
  })

  it('handles zod-based validation correctly', async () => {
    const promptProps = generateSimplePrompt({
      inputType: 'text',
      initialValue: '',
      title: 'Create a group',
      placeholder: 'Enter group name...',
      label: 'Name',
      validationSchema: z.string().min(1, 'Name is required'),
    })

    renderTestComponent({ promptProps })

    await userEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('')

    const okButton = screen.getByRole('button', { name: 'OK' })
    await userEvent.click(okButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    expect(screen.getByText('Name is required')).toBeVisible()
  })
})
