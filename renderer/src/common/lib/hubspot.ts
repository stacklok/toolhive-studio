import {
  HUBSPOT_PORTAL_ID,
  PRIVACY_POLICY_URL,
  COMPANY_NAME,
} from '@common/app-info'

export { HUBSPOT_PORTAL_ID, PRIVACY_POLICY_URL }

export const CONSENT_PROCESSING_TEXT = `I agree to allow ${COMPANY_NAME} to store and process my personal data.`

export function shouldShowAfterDismissal(
  flag: boolean,
  dismissedAt: string,
  dismissDays: number
): boolean {
  if (flag) return false
  if (!dismissedAt) return true

  const dismissed = new Date(dismissedAt).getTime()
  if (Number.isNaN(dismissed)) return true
  if (dismissed > Date.now()) return true

  const daysSinceDismissal = (Date.now() - dismissed) / (1000 * 60 * 60 * 24)
  return daysSinceDismissal >= dismissDays
}

export async function submitToHubSpot(options: {
  formId: string
  fields: { name: string; value: string }[]
  pageName: string
  consentToProcess: boolean
}): Promise<string | undefined> {
  const response = await fetch(
    `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${options.formId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: options.fields,
        context: {
          pageName: options.pageName,
        },
        legalConsentOptions: {
          consent: {
            consentToProcess: options.consentToProcess,
            text: CONSENT_PROCESSING_TEXT,
          },
        },
      }),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HubSpot submission failed (${response.status}): ${text}`)
  }

  try {
    const data = await response.json()
    if (typeof data?.inlineMessage !== 'string') return undefined
    const doc = new DOMParser().parseFromString(data.inlineMessage, 'text/html')
    return doc.body.textContent?.trim() || undefined
  } catch {
    return undefined
  }
}
