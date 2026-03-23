import { describe, it, expect, vi, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/common/mocks/node'
import { recordRequests } from '@/common/mocks/node'
import {
  shouldShowAfterDismissal,
  submitToHubSpot,
  HUBSPOT_PORTAL_ID,
  CONSENT_PROCESSING_TEXT,
} from '../hubspot'

const TEST_FORM_ID = 'test-form-id'
const HUBSPOT_URL = `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${TEST_FORM_ID}`

describe('shouldShowAfterDismissal', () => {
  it('returns false when flag is true', () => {
    expect(shouldShowAfterDismissal(true, '', 30)).toBe(false)
  })

  it('returns true when flag is false and never dismissed', () => {
    expect(shouldShowAfterDismissal(false, '', 30)).toBe(true)
  })

  it('returns true when dismissedAt is an invalid date', () => {
    expect(shouldShowAfterDismissal(false, 'not-a-date', 30)).toBe(true)
  })

  it('returns false when dismissed less than dismissDays ago', () => {
    const tenDaysAgo = new Date(
      Date.now() - 10 * 24 * 60 * 60 * 1000
    ).toISOString()
    expect(shouldShowAfterDismissal(false, tenDaysAgo, 30)).toBe(false)
  })

  it('returns true when dismissed more than dismissDays ago', () => {
    const thirtyFiveDaysAgo = new Date(
      Date.now() - 35 * 24 * 60 * 60 * 1000
    ).toISOString()
    expect(shouldShowAfterDismissal(false, thirtyFiveDaysAgo, 30)).toBe(true)
  })

  it('returns true when dismissed exactly dismissDays ago', () => {
    const exactlyThirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString()
    expect(shouldShowAfterDismissal(false, exactlyThirtyDaysAgo, 30)).toBe(true)
  })

  it('returns true when dismissedAt is in the future (clock skew)', () => {
    const tomorrow = new Date(
      Date.now() + 1 * 24 * 60 * 60 * 1000
    ).toISOString()
    expect(shouldShowAfterDismissal(false, tomorrow, 30)).toBe(true)
  })

  it('respects different dismissDays values', () => {
    const tenDaysAgo = new Date(
      Date.now() - 10 * 24 * 60 * 60 * 1000
    ).toISOString()
    expect(shouldShowAfterDismissal(false, tenDaysAgo, 5)).toBe(true)
    expect(shouldShowAfterDismissal(false, tenDaysAgo, 15)).toBe(false)
  })
})

describe('submitToHubSpot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.use(
      http.post(HUBSPOT_URL, () =>
        HttpResponse.json({
          inlineMessage: '<p>Thank you for submitting!</p>',
        })
      )
    )
  })

  it('sends correct payload and returns parsed inline message', async () => {
    const rec = recordRequests()

    const result = await submitToHubSpot({
      formId: TEST_FORM_ID,
      fields: [
        { name: 'email', value: 'test@example.com' },
        { name: 'instance_id', value: 'inst-123' },
      ],
      pageName: 'Test Page',
      consentToProcess: true,
    })

    expect(result).toBe('Thank you for submitting!')

    const hubspotRequest = rec.recordedRequests.find(
      (r) =>
        r.method === 'POST' &&
        r.pathname.includes('/submissions/v3/integration/submit/')
    )
    expect(hubspotRequest?.payload).toEqual({
      fields: [
        { name: 'email', value: 'test@example.com' },
        { name: 'instance_id', value: 'inst-123' },
      ],
      context: { pageName: 'Test Page' },
      legalConsentOptions: {
        consent: {
          consentToProcess: true,
          text: CONSENT_PROCESSING_TEXT,
        },
      },
    })
  })

  it('returns undefined when response has no inlineMessage', async () => {
    server.use(http.post(HUBSPOT_URL, () => HttpResponse.json({})))

    const result = await submitToHubSpot({
      formId: TEST_FORM_ID,
      fields: [{ name: 'email', value: 'test@example.com' }],
      pageName: 'Test Page',
      consentToProcess: true,
    })

    expect(result).toBeUndefined()
  })

  it('throws when the API returns an error status', async () => {
    server.use(
      http.post(HUBSPOT_URL, () =>
        HttpResponse.text('Bad Request', { status: 400 })
      )
    )

    await expect(
      submitToHubSpot({
        formId: TEST_FORM_ID,
        fields: [{ name: 'email', value: 'bad' }],
        pageName: 'Test Page',
        consentToProcess: false,
      })
    ).rejects.toThrow('HubSpot submission failed (400)')
  })

  it('returns undefined when response JSON is unparseable', async () => {
    server.use(
      http.post(HUBSPOT_URL, () => new HttpResponse('not json but ok'))
    )

    const result = await submitToHubSpot({
      formId: TEST_FORM_ID,
      fields: [{ name: 'email', value: 'test@example.com' }],
      pageName: 'Test Page',
      consentToProcess: true,
    })

    expect(result).toBeUndefined()
  })
})
