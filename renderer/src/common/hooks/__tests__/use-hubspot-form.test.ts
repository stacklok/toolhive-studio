import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { type ReactNode } from 'react'
import { http, HttpResponse } from 'msw'
import { server } from '@/common/mocks/node'
import { recordRequests } from '@/common/mocks/node'
import { HUBSPOT_PORTAL_ID } from '@/common/lib/hubspot'
import { useHubSpotForm } from '../use-hubspot-form'

const TEST_FORM_ID = 'test-form-abc'
const TEST_PAGE_NAME = 'Test Page'
const HUBSPOT_URL = `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${TEST_FORM_ID}`

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    )
  }
}

describe('useHubSpotForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.use(
      http.post(HUBSPOT_URL, () =>
        HttpResponse.json({ inlineMessage: '<p>Thanks!</p>' })
      )
    )
  })

  it('initializes with consentToProcess as false', () => {
    const { result } = renderHook(
      () => useHubSpotForm(TEST_FORM_ID, TEST_PAGE_NAME),
      { wrapper: createWrapper() }
    )

    expect(result.current.consentToProcess).toBe(false)
  })

  it('toggles consentToProcess via setConsentToProcess', () => {
    const { result } = renderHook(
      () => useHubSpotForm(TEST_FORM_ID, TEST_PAGE_NAME),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.setConsentToProcess(true)
    })

    expect(result.current.consentToProcess).toBe(true)
  })

  it('fetches instanceId from electronAPI', async () => {
    const { result } = renderHook(
      () => useHubSpotForm(TEST_FORM_ID, TEST_PAGE_NAME),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.instanceId).toBe('test-instance-id')
    })
  })

  it('submit() appends instance_id and sends correct payload', async () => {
    const rec = recordRequests()

    const { result } = renderHook(
      () => useHubSpotForm(TEST_FORM_ID, TEST_PAGE_NAME),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.instanceId).toBe('test-instance-id')
    })

    act(() => {
      result.current.setConsentToProcess(true)
    })

    await act(async () => {
      await result.current.submit([{ name: 'email', value: 'user@test.com' }])
    })

    const hubspotRequest = rec.recordedRequests.find(
      (r) =>
        r.method === 'POST' &&
        r.pathname.includes('/submissions/v3/integration/submit/')
    )
    expect(hubspotRequest).toBeDefined()
    expect(hubspotRequest?.payload).toMatchObject({
      fields: [
        { name: 'email', value: 'user@test.com' },
        { name: 'instance_id', value: 'test-instance-id' },
      ],
      context: { pageName: TEST_PAGE_NAME },
    })
  })
})
