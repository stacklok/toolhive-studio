import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, beforeEach, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { DialogProviderSettings } from '../dialog-provider-settings'

vi.mock('@/common/lib/analytics', () => ({
  trackEvent: vi.fn(),
}))

const mockChatAPI = {
  getSelectedModel: vi.fn(),
  getSettings: vi.fn(),
  getProviders: vi.fn(),
  saveSelectedModel: vi.fn(),
  saveSettings: vi.fn(),
  clearSettings: vi.fn(),
  fetchProviderModels: vi.fn(),
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('DialogProviderSettings', () => {
  beforeEach(() => {
    window.electronAPI.chat =
      mockChatAPI as unknown as typeof window.electronAPI.chat

    mockChatAPI.getProviders.mockResolvedValue([
      {
        id: 'ollama',
        name: 'Ollama',
        models: [],
      },
    ])

    mockChatAPI.getSelectedModel.mockResolvedValue({
      provider: '',
      model: '',
    })

    mockChatAPI.getSettings.mockResolvedValue({
      endpointURL: '',
      enabledTools: [],
    })

    mockChatAPI.saveSettings.mockResolvedValue({ success: true })
    mockChatAPI.saveSelectedModel.mockResolvedValue({ success: true })
  })

  describe('model refresh and auto-selection', () => {
    it('auto-selects first fetched model when saving after refresh', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()

      mockChatAPI.fetchProviderModels.mockResolvedValue({
        models: ['qwen2.5:0.5b', 'llama2'],
      })

      render(
        <DialogProviderSettings isOpen={true} onOpenChange={onOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /ollama/i })
        ).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /ollama/i }))

      const urlInput = screen.getByPlaceholderText('http://localhost:11434')
      await user.type(urlInput, 'http://localhost:11434')

      const buttons = screen.getAllByRole('button')
      const refreshBtn = buttons.find((btn) =>
        btn.querySelector('svg.lucide-refresh-cw')
      )
      expect(refreshBtn).toBeDefined()
      await user.click(refreshBtn!)

      await waitFor(() => {
        expect(screen.getByText(/connection successful/i)).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /save/i }))

      await waitFor(() => {
        expect(mockChatAPI.saveSelectedModel).toHaveBeenCalledWith(
          'ollama',
          'qwen2.5:0.5b'
        )
      })
    })

    it('shows model count in success message after refresh', async () => {
      const user = userEvent.setup()

      mockChatAPI.fetchProviderModels.mockResolvedValue({
        models: ['model1', 'model2', 'model3'],
      })

      render(<DialogProviderSettings isOpen={true} onOpenChange={vi.fn()} />, {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /ollama/i })
        ).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /ollama/i }))

      const urlInput = screen.getByPlaceholderText('http://localhost:11434')
      await user.type(urlInput, 'http://localhost:11434')

      const buttons = screen.getAllByRole('button')
      const refreshBtn = buttons.find((btn) =>
        btn.querySelector('svg.lucide-refresh-cw')
      )
      await user.click(refreshBtn!)

      await waitFor(() => {
        expect(screen.getByText(/Found 3 model/i)).toBeInTheDocument()
      })
    })
  })
})
