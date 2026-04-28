import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { ModelPicker } from '../model-picker'

Object.defineProperty(Element.prototype, 'hasPointerCapture', {
  value: vi.fn().mockReturnValue(false),
  writable: true,
})
Object.defineProperty(Element.prototype, 'setPointerCapture', {
  value: vi.fn(),
  writable: true,
})
Object.defineProperty(Element.prototype, 'releasePointerCapture', {
  value: vi.fn(),
  writable: true,
})
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true,
})

vi.mock('../provider-icons', () => ({
  getProviderIcon: (id: string) => <span data-testid={`provider-icon-${id}`} />,
}))

const mockChatAPI = {
  getProviders: vi.fn(),
  getSettings: vi.fn(),
}

function renderPicker(
  props: Partial<React.ComponentProps<typeof ModelPicker>> = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return render(<ModelPicker value={null} onChange={vi.fn()} {...props} />, {
    wrapper,
  })
}

describe('ModelPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI = {
      ...(window.electronAPI ?? {}),
      chat: {
        ...(window.electronAPI?.chat ?? {}),
        ...mockChatAPI,
      },
    } as unknown as typeof window.electronAPI

    mockChatAPI.getProviders.mockResolvedValue([
      { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini'] },
      {
        id: 'anthropic',
        name: 'Anthropic',
        models: ['claude-4-sonnet', 'claude-4-opus'],
      },
    ])
    mockChatAPI.getSettings.mockResolvedValue({ apiKey: 'sk-test' })
  })

  it('renders the placeholder when value is null', async () => {
    renderPicker({ placeholder: 'Pick a model' })
    expect(await screen.findByText('Pick a model')).toBeInTheDocument()
  })

  it('renders the selected model label when value is set', async () => {
    renderPicker({ value: { provider: 'openai', model: 'gpt-4o' } })

    await waitFor(() => {
      expect(screen.getByTestId('model-selector')).toHaveTextContent('gpt-4o')
    })
  })

  it('disables the trigger while providers are loading', async () => {
    let resolveProviders: (value: unknown) => void = () => {}
    mockChatAPI.getProviders.mockImplementation(
      () =>
        new Promise((res) => {
          resolveProviders = res
        })
    )

    renderPicker()
    expect(screen.getByTestId('model-selector')).toBeDisabled()

    resolveProviders([])
    await waitFor(() => {
      expect(screen.getByTestId('model-selector')).not.toBeDisabled()
    })
  })

  it('renders only providers that have credentials in the dropdown', async () => {
    mockChatAPI.getSettings.mockImplementation(async (id: string) =>
      id === 'openai' ? { apiKey: 'sk-test' } : { apiKey: '' }
    )

    renderPicker()
    await waitFor(() => {
      expect(screen.getByTestId('model-selector')).not.toBeDisabled()
    })

    await userEvent.click(screen.getByTestId('model-selector'))
    expect(await screen.findByText('OpenAI')).toBeInTheDocument()
    expect(screen.queryByText('Anthropic')).not.toBeInTheDocument()
  })

  it('calls onChange when a model is picked from a provider submenu', async () => {
    const onChange = vi.fn()
    renderPicker({ onChange })

    await waitFor(() => {
      expect(screen.getByTestId('model-selector')).not.toBeDisabled()
    })

    await userEvent.click(screen.getByTestId('model-selector'))
    await userEvent.click(await screen.findByText('OpenAI'))
    await userEvent.click(await screen.findByText('gpt-4o-mini'))

    expect(onChange).toHaveBeenCalledWith({
      provider: 'openai',
      model: 'gpt-4o-mini',
    })
  })

  it('shows the clear option only when value and onClear are set', async () => {
    const onClear = vi.fn()
    renderPicker({
      value: { provider: 'openai', model: 'gpt-4o' },
      onClear,
      clearLabel: 'No default model',
    })

    await waitFor(() => {
      expect(screen.getByTestId('model-selector')).not.toBeDisabled()
    })

    await userEvent.click(screen.getByTestId('model-selector'))
    const clear = await screen.findByText('No default model')
    await userEvent.click(clear)

    expect(onClear).toHaveBeenCalled()
  })

  it('does not show the clear option when value is null', async () => {
    renderPicker({ value: null, onClear: vi.fn() })

    await waitFor(() => {
      expect(screen.getByTestId('model-selector')).not.toBeDisabled()
    })

    await userEvent.click(screen.getByTestId('model-selector'))
    expect(screen.queryByText(/no default model/i)).not.toBeInTheDocument()
  })

  it('renders Provider Settings entry only when onOpenSettings is provided', async () => {
    const onOpenSettings = vi.fn()
    renderPicker({ onOpenSettings })

    await waitFor(() => {
      expect(screen.getByTestId('model-selector')).not.toBeDisabled()
    })

    await userEvent.click(screen.getByTestId('model-selector'))
    const settings = await screen.findByText('Provider Settings')
    await userEvent.click(settings)
    expect(onOpenSettings).toHaveBeenCalled()
  })
})
