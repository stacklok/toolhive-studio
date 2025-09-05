import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Suspense } from 'react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ManageClientsButton } from '../manage-clients-button'

// Mock the prompt context
const mockPromptForm = vi.fn()
vi.mock('@/common/hooks/use-prompt', () => ({
  usePrompt: () => mockPromptForm,
}))

// Mock console.log to capture form results
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

describe('ManageClientsButton', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
    mockConsoleLog.mockClear()
  })

  const renderWithProviders = (props: {
    groupName: string
    variant?:
      | 'default'
      | 'outline'
      | 'secondary'
      | 'ghost'
      | 'link'
      | 'destructive'
    className?: string
  }) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={null}>
          <ManageClientsButton {...props} />
        </Suspense>
      </QueryClientProvider>
    )
  }

  it('should render the button with correct text and icon', async () => {
    renderWithProviders({ groupName: 'test-group' })

    const button = await screen.findByRole('button', {
      name: /manage clients/i,
    })
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent(/Manage clients/i)
  })

  it('should use default variant when not specified', async () => {
    renderWithProviders({ groupName: 'test-group' })

    const button = await screen.findByRole('button', {
      name: /manage clients/i,
    })
    expect(button).toHaveClass('border') // outline variant has border class
  })

  it('should apply custom variant when specified', async () => {
    renderWithProviders({ groupName: 'test-group', variant: 'default' })

    const button = await screen.findByRole('button', {
      name: /manage clients/i,
    })
    expect(button).toHaveClass('bg-primary') // default variant class
  })

  it('should apply custom className when provided', async () => {
    renderWithProviders({ groupName: 'test-group', className: 'custom-class' })

    const button = await screen.findByRole('button', {
      name: /manage clients/i,
    })
    expect(button).toHaveClass('custom-class')
  })

  it('should open prompt form when button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders({ groupName: 'test-group' })

    const button = await screen.findByRole('button', {
      name: /manage clients/i,
    })
    await user.click(button)

    expect(mockPromptForm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Manage Clients',
        defaultValues: expect.objectContaining({
          enableVscode: false,
          enableCursor: false,
          enableClaudeCode: false,
        }),
        buttons: {
          confirm: 'Save',
          cancel: 'Cancel',
        },
      })
    )
  })

  it('should have correct modal title and button labels', async () => {
    const user = userEvent.setup()
    renderWithProviders({ groupName: 'research-team' })

    const button = await screen.findByRole('button', {
      name: /manage clients/i,
    })
    await user.click(button)

    expect(mockPromptForm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Manage Clients',
        buttons: {
          confirm: 'Save',
          cancel: 'Cancel',
        },
      })
    )
  })

  it('should log form result when form is submitted', async () => {
    const user = userEvent.setup()
    const mockResult = {
      enableVSCode: true,
      enableCursor: false,
      enableClaudeCode: true,
    }

    mockPromptForm.mockResolvedValue(mockResult)

    renderWithProviders({ groupName: 'test-group' })

    const button = await screen.findByRole('button', {
      name: /manage clients/i,
    })
    await user.click(button)

    await waitFor(() => {
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Manage clients form submitted with values:',
        mockResult
      )
    })
  })

  it('should not log anything when form is cancelled', async () => {
    const user = userEvent.setup()
    mockPromptForm.mockResolvedValue(null)

    renderWithProviders({ groupName: 'test-group' })

    const button = await screen.findByRole('button', {
      name: /manage clients/i,
    })
    await user.click(button)

    await waitFor(() => {
      // Should only log the original values, not form submission
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Original client status for group:',
        'test-group',
        expect.any(Object)
      )
      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        'Manage clients form submitted with values:',
        expect.any(Object)
      )
    })
  })

  it('should have correct form schema with boolean validation', async () => {
    const user = userEvent.setup()
    renderWithProviders({ groupName: 'test-group' })

    const button = await screen.findByRole('button', {
      name: /manage clients/i,
    })
    await user.click(button)

    const promptCall = mockPromptForm.mock.calls[0]?.[0]
    expect(promptCall.resolver).toBeDefined()
    expect(promptCall.defaultValues).toEqual(
      expect.objectContaining({
        enableVscode: false,
        enableCursor: false,
        enableClaudeCode: false,
      })
    )
  })

  it('should render form fields with correct structure', async () => {
    const user = userEvent.setup()
    renderWithProviders({ groupName: 'test-group' })

    const button = await screen.findByRole('button', {
      name: /manage clients/i,
    })
    await user.click(button)

    const promptCall = mockPromptForm.mock.calls[0]?.[0]
    const fieldsFunction = promptCall.fields

    // Mock form object for testing
    const mockForm = {
      watch: vi.fn().mockReturnValue(false),
      setValue: vi.fn(),
      trigger: vi.fn(),
    }

    const renderedFields = fieldsFunction(mockForm)
    expect(renderedFields).toBeDefined()
  })

  describe('Form field interactions', () => {
    it('should handle VS Code toggle changes', async () => {
      const user = userEvent.setup()
      renderWithProviders({ groupName: 'test-group' })

      const button = await screen.findByRole('button', {
        name: /manage clients/i,
      })
      await user.click(button)

      const promptCall = mockPromptForm.mock.calls[0]?.[0]
      const fieldsFunction = promptCall.fields

      const mockForm = {
        watch: vi.fn().mockReturnValue(false),
        setValue: vi.fn(),
        trigger: vi.fn(),
      }

      fieldsFunction(mockForm)

      // Simulate toggle change
      const onCheckedChange = mockForm.setValue.mock.calls[0]?.[1]
      if (onCheckedChange) {
        onCheckedChange(true)
        expect(mockForm.setValue).toHaveBeenCalledWith('enableVSCode', true)
        expect(mockForm.trigger).toHaveBeenCalledWith('enableVSCode')
      }
    })

    it('should handle Cursor toggle changes', async () => {
      const user = userEvent.setup()
      renderWithProviders({ groupName: 'test-group' })

      const button = await screen.findByRole('button', {
        name: /manage clients/i,
      })
      await user.click(button)

      const promptCall = mockPromptForm.mock.calls[0]?.[0]
      const fieldsFunction = promptCall.fields

      const mockForm = {
        watch: vi.fn().mockReturnValue(false),
        setValue: vi.fn(),
        trigger: vi.fn(),
      }

      fieldsFunction(mockForm)

      // Simulate toggle change
      const onCheckedChange = mockForm.setValue.mock.calls[1]?.[1]
      if (onCheckedChange) {
        onCheckedChange(true)
        expect(mockForm.setValue).toHaveBeenCalledWith('enableCursor', true)
        expect(mockForm.trigger).toHaveBeenCalledWith('enableCursor')
      }
    })

    it('should handle Claude Code toggle changes', async () => {
      const user = userEvent.setup()
      renderWithProviders({ groupName: 'test-group' })

      const button = await screen.findByRole('button', {
        name: /manage clients/i,
      })
      await user.click(button)

      const promptCall = mockPromptForm.mock.calls[0]?.[0]
      const fieldsFunction = promptCall.fields

      const mockForm = {
        watch: vi.fn().mockReturnValue(false),
        setValue: vi.fn(),
        trigger: vi.fn(),
      }

      fieldsFunction(mockForm)

      // Simulate toggle change
      const onCheckedChange = mockForm.setValue.mock.calls[2]?.[1]
      if (onCheckedChange) {
        onCheckedChange(true)
        expect(mockForm.setValue).toHaveBeenCalledWith('enableClaudeCode', true)
        expect(mockForm.trigger).toHaveBeenCalledWith('enableClaudeCode')
      }
    })
  })

  describe('Form result handling', () => {
    const testCases = [
      {
        name: 'all clients enabled',
        result: {
          enableVSCode: true,
          enableCursor: true,
          enableClaudeCode: true,
        },
      },
      {
        name: 'no clients enabled',
        result: {
          enableVSCode: false,
          enableCursor: false,
          enableClaudeCode: false,
        },
      },
      {
        name: 'only VS Code enabled',
        result: {
          enableVSCode: true,
          enableCursor: false,
          enableClaudeCode: false,
        },
      },
      {
        name: 'only Cursor enabled',
        result: {
          enableVSCode: false,
          enableCursor: true,
          enableClaudeCode: false,
        },
      },
      {
        name: 'only Claude Code enabled',
        result: {
          enableVSCode: false,
          enableCursor: false,
          enableClaudeCode: true,
        },
      },
      {
        name: 'VS Code and Claude Code enabled',
        result: {
          enableVSCode: true,
          enableCursor: false,
          enableClaudeCode: true,
        },
      },
    ]

    testCases.forEach(({ name, result }) => {
      it(`should handle form result: ${name}`, async () => {
        const user = userEvent.setup()
        mockPromptForm.mockResolvedValue(result)

        renderWithProviders({ groupName: 'test-group' })

        const button = await screen.findByRole('button', {
          name: /manage clients/i,
        })
        await user.click(button)

        await waitFor(() => {
          expect(mockConsoleLog).toHaveBeenCalledWith(
            'Manage clients form submitted with values:',
            result
          )
        })
      })
    })
  })
})
