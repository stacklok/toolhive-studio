import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { LlmGatewaySettingsPanel } from '../llm-gateway-settings-panel'

const mockLlmGateway = {
  getStatus: vi.fn(),
  getConfig: vi.fn(),
  saveConfig: vi.fn(),
  ensureStarted: vi.fn(),
  warmupAuth: vi.fn(),
  disable: vi.fn(),
  invalidateConfig: vi.fn(),
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

describe('LlmGatewaySettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI.chat = {
      ...window.electronAPI.chat,
      llmGateway: mockLlmGateway,
    } as unknown as typeof window.electronAPI.chat

    mockLlmGateway.getConfig.mockResolvedValue({
      gatewayUrl: 'https://gw.example',
      issuer: 'https://issuer.example',
      clientId: 'client',
      audience: 'api://gw',
      callbackPort: 8080,
      proxyPort: 14000,
      configured: true,
    })
    mockLlmGateway.getStatus.mockResolvedValue({
      configured: true,
      proxyRunning: false,
      authState: 'proxy_stopped',
      listenPort: 14000,
      baseURL: 'http://127.0.0.1:14000/v1',
      gatewayURL: 'https://gw.example',
      modelCount: 0,
      error: null,
      studioOwnsProxy: false,
    })
    mockLlmGateway.saveConfig.mockResolvedValue({ ok: true })
    mockLlmGateway.ensureStarted.mockResolvedValue({ started: true })
    mockLlmGateway.warmupAuth.mockResolvedValue({ ready: true })
  })

  it('hydrates saved connection settings into the form', async () => {
    render(<LlmGatewaySettingsPanel />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByLabelText('Gateway URL')).toHaveValue(
        'https://gw.example'
      )
    })
    expect(screen.getByLabelText('Issuer')).toHaveValue(
      'https://issuer.example'
    )
    expect(screen.getByLabelText('Client ID')).toHaveValue('client')
  })

  it('saves the connection settings', async () => {
    const user = userEvent.setup()
    render(<LlmGatewaySettingsPanel />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByLabelText('Gateway URL')).toHaveValue(
        'https://gw.example'
      )
    })

    await user.click(
      screen.getByRole('button', { name: /save connection settings/i })
    )

    await waitFor(() => {
      expect(mockLlmGateway.saveConfig).toHaveBeenCalledWith({
        gatewayUrl: 'https://gw.example',
        issuer: 'https://issuer.example',
        clientId: 'client',
        audience: 'api://gw',
        callbackPort: 8080,
        proxyPort: 14000,
      })
    })
  })

  it('shows a save error from the main process', async () => {
    const user = userEvent.setup()
    mockLlmGateway.saveConfig.mockResolvedValue({
      ok: false,
      error: 'Gateway URL, issuer, and client ID are required.',
    })

    render(<LlmGatewaySettingsPanel />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByLabelText('Gateway URL')).toBeVisible()
    })

    await user.click(
      screen.getByRole('button', { name: /save connection settings/i })
    )

    expect(
      await screen.findByText(
        'Gateway URL, issuer, and client ID are required.'
      )
    ).toBeVisible()
  })

  it('starts the proxy when it is stopped', async () => {
    const user = userEvent.setup()
    render(<LlmGatewaySettingsPanel />, { wrapper: createWrapper() })

    await user.click(
      await screen.findByRole('button', { name: /start proxy/i })
    )

    await waitFor(() => {
      expect(mockLlmGateway.ensureStarted).toHaveBeenCalled()
    })
  })

  it('shows a save error when starting the proxy fails', async () => {
    const user = userEvent.setup()
    mockLlmGateway.ensureStarted.mockRejectedValue(new Error('proxy timeout'))

    render(<LlmGatewaySettingsPanel />, { wrapper: createWrapper() })

    await user.click(
      await screen.findByRole('button', { name: /start proxy/i })
    )

    expect(await screen.findByText('proxy timeout')).toBeVisible()
  })

  it('signs in through the gateway warmup flow', async () => {
    const user = userEvent.setup()
    mockLlmGateway.getStatus.mockResolvedValue({
      configured: true,
      proxyRunning: true,
      authState: 'authenticating',
      listenPort: 14000,
      baseURL: 'http://127.0.0.1:14000/v1',
      gatewayURL: 'https://gw.example',
      modelCount: 0,
      error: null,
      studioOwnsProxy: true,
    })
    mockLlmGateway.warmupAuth.mockResolvedValue({ ready: true, modelCount: 1 })

    render(<LlmGatewaySettingsPanel />, { wrapper: createWrapper() })

    await user.click(await screen.findByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockLlmGateway.ensureStarted).toHaveBeenCalled()
      expect(mockLlmGateway.warmupAuth).toHaveBeenCalled()
    })
  })
})
