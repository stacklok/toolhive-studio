import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { vi, beforeEach, afterEach } from 'vitest'
import { usePrompt } from '../use-prompt'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import { type PromptConfig } from '@/common/contexts/prompt'

function TestComponent({
  message,
  config,
  buttonLabel = 'Trigger Prompt',
  testId = 'test-component',
}: {
  message: string
  config?: PromptConfig
  buttonLabel?: string
  testId?: string
}) {
  const prompt = usePrompt()
  const [result, setResult] = useState<string | null | undefined>(undefined)

  const handleClick = async () => {
    const value = await prompt(message, config)
    setResult(value)
  }

  return (
    <div data-testid={testId}>
      <button onClick={handleClick}>{buttonLabel}</button>
      {result !== undefined && (
        <div data-testid="result">
          {result === null ? 'Cancelled' : `Result: ${result}`}
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
  it('throws error when used outside PromptProvider', () => {
    const TestComponentOutsideProvider = () => {
      usePrompt()
      return null
    }

    expect(() => {
      render(<TestComponentOutsideProvider />)
    }).toThrow('usePrompt must be used within a PromptProvider')
  })

  it('shows prompt dialog with basic configuration', async () => {
    const user = userEvent.setup()

    renderTestComponent({ message: 'Enter your name:' })

    await user.click(screen.getByRole('button', { name: 'Trigger Prompt' }))

    expect(screen.getByRole('textbox')).toBeVisible()
    expect(screen.getByRole('button', { name: 'OK' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeVisible()
    expect(screen.getByText('Enter your name:')).toBeVisible()
  })

  it('returns input value when user clicks OK', async () => {
    const user = userEvent.setup()

    renderTestComponent({ message: 'Enter your name:' })

    await user.click(screen.getByRole('button', { name: 'Trigger Prompt' }))

    const input = screen.getByRole('textbox')
    await user.type(input, 'John Doe')
    await user.click(screen.getByRole('button', { name: 'OK' }))

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Result: John Doe')
    })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('returns null when user clicks Cancel', async () => {
    const user = userEvent.setup()

    renderTestComponent({ message: 'Enter your name:' })

    await user.click(screen.getByRole('button', { name: 'Trigger Prompt' }))

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Cancelled')
    })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('supports custom title and description', async () => {
    const user = userEvent.setup()

    renderTestComponent({
      message: 'Enter your name:',
      config: {
        title: 'User Information',
        description: 'Please provide your full name for the account.',
      },
    })

    await user.click(screen.getByRole('button', { name: 'Trigger Prompt' }))

    expect(screen.getByText('User Information')).toBeVisible()
    expect(
      screen.getByText('Please provide your full name for the account.')
    ).toBeVisible()
  })

  it('supports default value', async () => {
    const user = userEvent.setup()

    renderTestComponent({
      message: 'Enter your name:',
      config: { defaultValue: 'John Doe' },
    })

    await user.click(screen.getByRole('button', { name: 'Trigger Prompt' }))

    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('John Doe')

    await user.click(screen.getByRole('button', { name: 'OK' }))

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Result: John Doe')
    })
  })

  it('supports custom button labels', async () => {
    const user = userEvent.setup()

    renderTestComponent({
      message: 'Enter your name:',
      config: {
        buttons: { confirm: 'Submit', cancel: 'Abort' },
      },
    })

    await user.click(screen.getByRole('button', { name: 'Trigger Prompt' }))

    expect(screen.getByRole('button', { name: 'Submit' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Abort' })).toBeVisible()
  })

  it('validates required input', async () => {
    const user = userEvent.setup()

    renderTestComponent({
      message: 'Enter your name:',
      config: {
        validation: { required: true },
      },
    })

    await user.click(screen.getByRole('button', { name: 'Trigger Prompt' }))

    // Try to submit empty input
    await user.click(screen.getByRole('button', { name: 'OK' }))

    expect(screen.getByText('This field is required')).toBeVisible()
    expect(screen.getByRole('dialog')).toBeVisible() // Dialog should still be open

    // Enter valid input
    const input = screen.getByRole('textbox')
    await user.type(input, 'John')
    await user.click(screen.getByRole('button', { name: 'OK' }))

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Result: John')
    })
  })

  it('validates minimum length', async () => {
    const user = userEvent.setup()

    renderTestComponent({
      message: 'Enter password:',
      config: {
        validation: { minLength: 6 },
      },
    })

    await user.click(screen.getByRole('button', { name: 'Trigger Prompt' }))

    const input = screen.getByRole('textbox')
    await user.type(input, '123')
    await user.click(screen.getByRole('button', { name: 'OK' }))

    expect(screen.getByText('Must be at least 6 characters')).toBeVisible()

    // Clear and enter valid input
    await user.clear(input)
    await user.type(input, '123456')
    await user.click(screen.getByRole('button', { name: 'OK' }))

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Result: 123456')
    })
  })

  it('supports Enter key to confirm', async () => {
    const user = userEvent.setup()

    renderTestComponent({ message: 'Enter your name:' })

    await user.click(screen.getByRole('button', { name: 'Trigger Prompt' }))

    const input = screen.getByRole('textbox')
    await user.type(input, 'John Doe{enter}')

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Result: John Doe')
    })
  })

  it('supports Escape key to cancel', async () => {
    const user = userEvent.setup()

    renderTestComponent({ message: 'Enter your name:', testId: 'escape-test' })

    await user.click(screen.getByRole('button', { name: 'Trigger Prompt' }))

    const input = screen.getByRole('textbox')
    await user.type(input, 'John')
    await user.keyboard('{escape}')

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('Cancelled')
    })
  })

  it('supports password input type', async () => {
    const user = userEvent.setup()

    renderTestComponent({
      message: 'Enter password:',
      config: { inputType: 'password' },
    })

    await user.click(screen.getByRole('button', { name: 'Trigger Prompt' }))

    const input = screen.getByLabelText('Enter password:')
    expect(input).toHaveAttribute('type', 'password')
  })
})
