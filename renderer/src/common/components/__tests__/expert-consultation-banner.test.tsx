import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/common/mocks/node'
import { recordRequests } from '@/common/mocks/node'
import { mockedGetApiV1BetaWorkloads } from '@mocks/fixtures/workloads/get'
import {
  APP_DISPLAY_NAME,
  DEMO_URL,
  HUBSPOT_EXPERT_CONSULTATION_FORM_ID,
  HUBSPOT_PORTAL_ID,
} from '@common/app-info'

const mockUseMatches = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useMatches: () => mockUseMatches(),
}))

import { ExpertConsultationBanner } from '../expert-consultation-banner'

const HUBSPOT_URL = `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_EXPERT_CONSULTATION_FORM_ID}`

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

describe('ExpertConsultationBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseMatches.mockReturnValue([{ routeId: '/group/$groupName' }])

    window.electronAPI.getExpertConsultationState = vi
      .fn()
      .mockResolvedValue({ submitted: false, dismissedAt: '' })
    window.electronAPI.setExpertConsultationSubmitted = vi
      .fn()
      .mockResolvedValue(undefined)
    window.electronAPI.setExpertConsultationDismissedAt = vi
      .fn()
      .mockResolvedValue(undefined)

    // Newsletter is subscribed so it won't block the banner
    window.electronAPI.getNewsletterState = vi
      .fn()
      .mockResolvedValue({ subscribed: true, dismissedAt: '' })

    server.use(
      http.post(HUBSPOT_URL, () =>
        HttpResponse.json({ inlineMessage: 'Thanks for reaching out!' })
      )
    )
  })

  describe('visibility', () => {
    it('renders banner when conditions are met (>3 servers in a group, not submitted, newsletter not showing)', async () => {
      renderWithProviders(<ExpertConsultationBanner />)

      await waitFor(() => {
        expect(
          screen.getByText(
            /What's standing between your MCP setup and production/
          )
        ).toBeVisible()
      })
    })

    it('does not render on non-group routes', async () => {
      mockUseMatches.mockReturnValue([{ routeId: '/(registry)' }])

      renderWithProviders(<ExpertConsultationBanner />)

      await waitFor(() => {
        expect(window.electronAPI.getExpertConsultationState).toHaveBeenCalled()
      })
      expect(
        screen.queryByText(
          /What's standing between your MCP setup and production/
        )
      ).not.toBeInTheDocument()
    })

    it('does not render when already submitted', async () => {
      window.electronAPI.getExpertConsultationState = vi
        .fn()
        .mockResolvedValue({ submitted: true, dismissedAt: '' })

      renderWithProviders(<ExpertConsultationBanner />)

      await waitFor(() => {
        expect(window.electronAPI.getExpertConsultationState).toHaveBeenCalled()
      })
      expect(
        screen.queryByText(
          /What's standing between your MCP setup and production/
        )
      ).not.toBeInTheDocument()
    })

    it('does not render when dismissed less than 30 days ago', async () => {
      const recentDismissal = new Date(
        Date.now() - 10 * 24 * 60 * 60 * 1000
      ).toISOString()
      window.electronAPI.getExpertConsultationState = vi
        .fn()
        .mockResolvedValue({ submitted: false, dismissedAt: recentDismissal })

      renderWithProviders(<ExpertConsultationBanner />)

      await waitFor(() => {
        expect(window.electronAPI.getExpertConsultationState).toHaveBeenCalled()
      })
      expect(
        screen.queryByText(
          /What's standing between your MCP setup and production/
        )
      ).not.toBeInTheDocument()
    })

    it('renders when dismissed more than 30 days ago', async () => {
      const oldDismissal = new Date(
        Date.now() - 35 * 24 * 60 * 60 * 1000
      ).toISOString()
      window.electronAPI.getExpertConsultationState = vi
        .fn()
        .mockResolvedValue({ submitted: false, dismissedAt: oldDismissal })

      renderWithProviders(<ExpertConsultationBanner />)

      await waitFor(() => {
        expect(
          screen.getByText(
            /What's standing between your MCP setup and production/
          )
        ).toBeVisible()
      })
    })

    it('does not render when newsletter modal is visible (not subscribed, not dismissed)', async () => {
      window.electronAPI.getNewsletterState = vi
        .fn()
        .mockResolvedValue({ subscribed: false, dismissedAt: '' })

      renderWithProviders(<ExpertConsultationBanner />)

      await waitFor(() => {
        expect(window.electronAPI.getNewsletterState).toHaveBeenCalled()
      })
      expect(
        screen.queryByText(
          /What's standing between your MCP setup and production/
        )
      ).not.toBeInTheDocument()
    })

    it('renders when newsletter was dismissed recently (newsletter modal hidden)', async () => {
      const recentNewsDismissal = new Date(
        Date.now() - 5 * 24 * 60 * 60 * 1000
      ).toISOString()
      window.electronAPI.getNewsletterState = vi.fn().mockResolvedValue({
        subscribed: false,
        dismissedAt: recentNewsDismissal,
      })

      renderWithProviders(<ExpertConsultationBanner />)

      await waitFor(() => {
        expect(
          screen.getByText(
            /What's standing between your MCP setup and production/
          )
        ).toBeVisible()
      })
    })

    it('does not render when no group has more than 3 servers', async () => {
      mockedGetApiV1BetaWorkloads.override(() => ({
        workloads: [
          { name: 'server-1', group: 'default', status: 'running' },
          { name: 'server-2', group: 'default', status: 'running' },
        ],
      }))

      renderWithProviders(<ExpertConsultationBanner />)

      await waitFor(() => {
        expect(window.electronAPI.getExpertConsultationState).toHaveBeenCalled()
      })
      expect(
        screen.queryByText(
          /What's standing between your MCP setup and production/
        )
      ).not.toBeInTheDocument()
    })
  })

  describe('dismiss', () => {
    it('calls setExpertConsultationDismissedAt when close button is clicked', async () => {
      renderWithProviders(<ExpertConsultationBanner />)

      await waitFor(() => {
        expect(
          screen.getByText(
            /What's standing between your MCP setup and production/
          )
        ).toBeVisible()
      })

      const closeButton = screen.getByRole('button', { name: /close/i })
      await userEvent.click(closeButton)

      await waitFor(() => {
        expect(
          window.electronAPI.setExpertConsultationDismissedAt
        ).toHaveBeenCalledWith(expect.any(String))
      })

      const calledWith = vi.mocked(
        window.electronAPI.setExpertConsultationDismissedAt
      ).mock.calls[0]?.[0]
      expect(new Date(calledWith!).getTime()).not.toBeNaN()
    })
  })

  describe('modal', () => {
    it('opens modal when CTA is clicked', async () => {
      renderWithProviders(<ExpertConsultationBanner />)

      await waitFor(() => {
        expect(
          screen.getByText(
            /What's standing between your MCP setup and production/
          )
        ).toBeVisible()
      })

      await userEvent.click(
        screen.getByRole('button', { name: /talk to an expert/i })
      )

      await waitFor(() => {
        expect(screen.getByText('Request a demo')).toBeVisible()
      })
    })
  })

  describe('form validation', () => {
    async function openModal() {
      renderWithProviders(<ExpertConsultationBanner />)

      await waitFor(() => {
        expect(
          screen.getByText(
            /What's standing between your MCP setup and production/
          )
        ).toBeVisible()
      })

      await userEvent.click(
        screen.getByRole('button', { name: /talk to an expert/i })
      )

      await waitFor(() => {
        expect(screen.getByPlaceholderText('First name *')).toBeVisible()
      })
    }

    it('disables submit when required fields are empty', async () => {
      await openModal()

      await userEvent.click(
        screen.getByRole('checkbox', {
          name: /store and process my personal data/i,
        })
      )

      await userEvent.type(
        screen.getByPlaceholderText('Email *'),
        'user@example.com'
      )

      expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
    })

    it('shows error for invalid email', async () => {
      await openModal()

      await userEvent.type(screen.getByPlaceholderText('First name *'), 'John')
      await userEvent.type(screen.getByPlaceholderText('Last name *'), 'Doe')
      await userEvent.type(
        screen.getByPlaceholderText('Email *'),
        'not-an-email'
      )

      await userEvent.click(
        screen.getByRole('checkbox', {
          name: /store and process my personal data/i,
        })
      )

      await userEvent.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(
          screen.getByText('Please enter a valid email address')
        ).toBeVisible()
      })
    })

    it('disables submit button when processing consent is not checked', async () => {
      await openModal()

      await userEvent.type(screen.getByPlaceholderText('First name *'), 'John')
      await userEvent.type(screen.getByPlaceholderText('Last name *'), 'Doe')
      await userEvent.type(
        screen.getByPlaceholderText('Email *'),
        'user@example.com'
      )

      expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
    })
  })

  describe('submission', () => {
    async function openAndFillForm() {
      renderWithProviders(<ExpertConsultationBanner />)

      await waitFor(() => {
        expect(
          screen.getByText(
            /What's standing between your MCP setup and production/
          )
        ).toBeVisible()
      })

      await userEvent.click(
        screen.getByRole('button', { name: /talk to an expert/i })
      )

      await waitFor(() => {
        expect(screen.getByPlaceholderText('First name *')).toBeVisible()
      })

      await userEvent.click(
        screen.getByRole('checkbox', {
          name: /store and process my personal data/i,
        })
      )

      await userEvent.type(screen.getByPlaceholderText('First name *'), 'John')
      await userEvent.type(screen.getByPlaceholderText('Last name *'), 'Doe')
      await userEvent.type(
        screen.getByPlaceholderText('Email *'),
        'user@example.com'
      )
      await userEvent.type(
        screen.getByPlaceholderText('Company name'),
        'Acme Inc'
      )
      await userEvent.type(
        screen.getByPlaceholderText(
          'Is there anything you would like us to know?'
        ),
        'Need help with auth'
      )
    }

    it('calls HubSpot API with all fields and consent, marks as submitted, and shows success', async () => {
      const rec = recordRequests()

      await openAndFillForm()

      await userEvent.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(
          window.electronAPI.setExpertConsultationSubmitted
        ).toHaveBeenCalledWith(true)
      })

      expect(screen.getByText('Success!')).toBeVisible()
      expect(screen.getByText('Thanks for reaching out!')).toBeVisible()

      const hubspotRequest = rec.recordedRequests.find(
        (r) =>
          r.method === 'POST' &&
          r.pathname.includes('/submissions/v3/integration/submit/')
      )
      expect(hubspotRequest).toBeDefined()
      expect(hubspotRequest?.payload).toEqual({
        fields: [
          { name: 'firstname', value: 'John' },
          { name: 'lastname', value: 'Doe' },
          { name: 'email', value: 'user@example.com' },
          { name: 'company', value: 'Acme Inc' },
          { name: 'message', value: 'Need help with auth' },
          { name: 'instance_id', value: 'test-instance-id' },
        ],
        context: {
          pageName: `${APP_DISPLAY_NAME} - Expert Consultation`,
        },
        legalConsentOptions: {
          consent: {
            consentToProcess: true,
            text: expect.any(String),
          },
        },
      })
    })

    it('shows error message and does not mark as submitted when HubSpot API fails', async () => {
      server.use(
        http.post(HUBSPOT_URL, () => new HttpResponse(null, { status: 500 }))
      )

      await openAndFillForm()

      await userEvent.click(screen.getByRole('button', { name: /submit/i }))

      await waitFor(() => {
        expect(screen.getByText(/Something went wrong/i)).toBeVisible()
      })
      expect(
        screen.getByRole('link', { name: /stacklok\.com\/demo/i })
      ).toHaveAttribute('href', DEMO_URL)

      expect(
        window.electronAPI.setExpertConsultationSubmitted
      ).not.toHaveBeenCalled()
    })
  })
})
