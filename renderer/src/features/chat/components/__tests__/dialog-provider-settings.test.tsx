import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, beforeEach, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { DialogProviderSettings } from '../dialog-provider-settings'

// Mock analytics (not in global setup)
vi.mock('@/common/lib/analytics', () => ({
  trackEvent: vi.fn(),
}))

// Mock electron API chat methods
const mockChatAPI = {
  getSelectedModel: vi.fn(),
  getSettings: vi.fn(),
  getProviders: vi.fn(),
  saveSelectedModel: vi.fn(),
  saveSettings: vi.fn(),
  clearSettings: vi.fn(),
  fetchProviderModels: vi.fn(),
}

// Extend the existing window.electronAPI with chat methods
Object.defineProperty(window, 'electronAPI', {
  value: { ...window.electronAPI, chat: mockChatAPI },
  writable: true,
})

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
    // Default: Ollama provider with no models initially
    mockChatAPI.getProviders.mockResolvedValue([
      {
        id: 'ollama',
        name: 'Ollama',
        models: [], // No models initially - this is the key setup for the bug
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

  describe('Ollama model refresh bug', () => {
    it('should update local state with fetched models after refresh so save can auto-select a model', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()

      // Mock fetchProviderModels to return models (simulating successful Ollama connection)
      mockChatAPI.fetchProviderModels.mockResolvedValue({
        models: ['qwen2.5:0.5b', 'llama2'],
      })

      render(
        <DialogProviderSettings isOpen={true} onOpenChange={onOpenChange} />,
        { wrapper: createWrapper() }
      )

      // Wait for providers to load and expand Ollama section
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /ollama/i })
        ).toBeInTheDocument()
      })

      // Expand Ollama section
      await user.click(screen.getByRole('button', { name: /ollama/i }))

      // Enter server URL
      const urlInput = screen.getByPlaceholderText('http://localhost:11434')
      await user.type(urlInput, 'http://localhost:11434')

      // Click refresh button to test connection
      const buttons = screen.getAllByRole('button')
      const refreshBtn = buttons.find((btn) =>
        btn.querySelector('svg.lucide-refresh-cw')
      )
      expect(refreshBtn).toBeDefined()
      await user.click(refreshBtn!)

      // Wait for the success message
      await waitFor(() => {
        expect(screen.getByText(/connection successful/i)).toBeInTheDocument()
      })

      // Click Save
      await user.click(screen.getByRole('button', { name: /save/i }))

      // Verify that saveSelectedModel was called with Ollama AND a non-empty model
      // This is the bug: without the fix, model would be '' because providerKeys.provider.models was empty
      await waitFor(() => {
        expect(mockChatAPI.saveSelectedModel).toHaveBeenCalledWith(
          'ollama',
          'qwen2.5:0.5b' // First model from the fetched list
        )
      })
    })

    it('should show correct model count in success message after refresh', async () => {
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
