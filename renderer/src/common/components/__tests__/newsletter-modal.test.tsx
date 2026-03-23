import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/common/mocks/node'
import { recordRequests } from '@/common/mocks/node'
import { NewsletterModal } from '../newsletter-modal'

const HUBSPOT_URL =
  'https://api.hsforms.com/submissions/v3/integration/submit/42544743/8f75a6a3-bf6d-4cd0-8da5-0092ecfda250'

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  )
}

async function fillAndSubmitForm(email: string) {
  await waitFor(() => {
    expect(screen.getByPlaceholderText('name@domain.com')).toBeVisible()
  })

  await userEvent.type(screen.getByPlaceholderText('name@domain.com'), email)

  await userEvent.click(
    screen.getByRole('checkbox', {
      name: /store and process my personal data/i,
    })
  )

  await userEvent.click(screen.getByRole('button', { name: /sign up/i }))
}

describe('NewsletterModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    window.electronAPI.getNewsletterState = vi
      .fn()
      .mockResolvedValue({ subscribed: false, dismissedAt: '' })
    window.electronAPI.setNewsletterSubscribed = vi
      .fn()
      .mockResolvedValue(undefined)
    window.electronAPI.setNewsletterDismissedAt = vi
      .fn()
      .mockResolvedValue(undefined)

    server.use(
      http.post(HUBSPOT_URL, () =>
        HttpResponse.json({ inlineMessage: 'Thanks!' })
      )
    )
  })

  describe('visibility', () => {
    it('renders when not subscribed and never dismissed', async () => {
      renderWithProviders(<NewsletterModal />)

      await waitFor(() => {
        expect(
          screen.getByText('Stay up to date with improvements to ToolHive')
        ).toBeVisible()
      })
    })

    it('does not render when subscribed', async () => {
      window.electronAPI.getNewsletterState = vi
        .fn()
        .mockResolvedValue({ subscribed: true, dismissedAt: '' })

      renderWithProviders(<NewsletterModal />)

      await waitFor(() => {
        expect(window.electronAPI.getNewsletterState).toHaveBeenCalled()
      })
      expect(
        screen.queryByText('Stay up to date with improvements to ToolHive')
      ).not.toBeInTheDocument()
    })

    it('does not render when dismissed less than 15 days ago', async () => {
      const recentDismissal = new Date(
        Date.now() - 10 * 24 * 60 * 60 * 1000
      ).toISOString()
      window.electronAPI.getNewsletterState = vi
        .fn()
        .mockResolvedValue({ subscribed: false, dismissedAt: recentDismissal })

      renderWithProviders(<NewsletterModal />)

      await waitFor(() => {
        expect(window.electronAPI.getNewsletterState).toHaveBeenCalled()
      })
      expect(
        screen.queryByText('Stay up to date with improvements to ToolHive')
      ).not.toBeInTheDocument()
    })

    it('renders when dismissed more than 15 days ago', async () => {
      const oldDismissal = new Date(
        Date.now() - 20 * 24 * 60 * 60 * 1000
      ).toISOString()
      window.electronAPI.getNewsletterState = vi
        .fn()
        .mockResolvedValue({ subscribed: false, dismissedAt: oldDismissal })

      renderWithProviders(<NewsletterModal />)

      await waitFor(() => {
        expect(
          screen.getByText('Stay up to date with improvements to ToolHive')
        ).toBeVisible()
      })
    })
  })

  describe('validation', () => {
    it('shows error for invalid email', async () => {
      renderWithProviders(<NewsletterModal />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('name@domain.com')).toBeVisible()
      })

      const input = screen.getByPlaceholderText('name@domain.com')
      await userEvent.type(input, 'not-an-email')
      await userEvent.click(
        screen.getByRole('checkbox', {
          name: /store and process my personal data/i,
        })
      )
      await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

      await waitFor(() => {
        expect(
          screen.getByText('Please enter a valid email address')
        ).toBeVisible()
      })
    })

    it('clears error when user types after validation failure', async () => {
      renderWithProviders(<NewsletterModal />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('name@domain.com')).toBeVisible()
      })

      const input = screen.getByPlaceholderText('name@domain.com')
      await userEvent.type(input, 'bad')
      await userEvent.click(
        screen.getByRole('checkbox', {
          name: /store and process my personal data/i,
        })
      )
      await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

      await waitFor(() => {
        expect(
          screen.getByText('Please enter a valid email address')
        ).toBeVisible()
      })

      await userEvent.type(input, 'a')

      await waitFor(() => {
        expect(
          screen.queryByText('Please enter a valid email address')
        ).not.toBeInTheDocument()
      })
    })

    it('disables submit button when processing consent is not checked', async () => {
      renderWithProviders(<NewsletterModal />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('name@domain.com')).toBeVisible()
      })

      await userEvent.type(
        screen.getByPlaceholderText('name@domain.com'),
        'user@example.com'
      )

      expect(screen.getByRole('button', { name: /sign up/i })).toBeDisabled()
    })
  })

  describe('submission', () => {
    it('calls HubSpot API with consent, marks as subscribed, and shows success message', async () => {
      const rec = recordRequests()

      renderWithProviders(<NewsletterModal />)

      await fillAndSubmitForm('user@example.com')

      await waitFor(() => {
        expect(window.electronAPI.setNewsletterSubscribed).toHaveBeenCalledWith(
          true
        )
      })

      expect(screen.getByText('Success!')).toBeVisible()
      expect(screen.getByText('Thanks!')).toBeVisible()

      const hubspotRequest = rec.recordedRequests.find(
        (r) =>
          r.method === 'POST' &&
          r.pathname.includes('/submissions/v3/integration/submit/')
      )
      expect(hubspotRequest).toBeDefined()
      expect(hubspotRequest?.payload).toEqual({
        fields: [{ name: 'email', value: 'user@example.com' }],
        context: {
          pageName: 'ToolHive Desktop - Newsletter Signup',
        },
        legalConsentOptions: {
          consent: {
            consentToProcess: true,
            text: expect.any(String),
          },
        },
      })
    })

    it('shows error message and does not mark as subscribed when HubSpot API fails', async () => {
      server.use(
        http.post(HUBSPOT_URL, () => new HttpResponse(null, { status: 500 }))
      )

      renderWithProviders(<NewsletterModal />)

      await fillAndSubmitForm('user@example.com')

      await waitFor(() => {
        expect(
          screen.getByText('Something went wrong. Please try again.')
        ).toBeVisible()
      })

      expect(window.electronAPI.setNewsletterSubscribed).not.toHaveBeenCalled()
    })
  })

  describe('dismiss', () => {
    it('calls setNewsletterDismissedAt when close button is clicked', async () => {
      renderWithProviders(<NewsletterModal />)

      await waitFor(() => {
        expect(
          screen.getByText('Stay up to date with improvements to ToolHive')
        ).toBeVisible()
      })

      const closeButton = screen.getByRole('button', { name: /close/i })
      await userEvent.click(closeButton)

      await waitFor(() => {
        expect(
          window.electronAPI.setNewsletterDismissedAt
        ).toHaveBeenCalledWith(expect.any(String))
      })

      const calledWith = vi.mocked(window.electronAPI.setNewsletterDismissedAt)
        .mock.calls[0]?.[0]
      expect(new Date(calledWith!).getTime()).not.toBeNaN()
    })
  })
})
