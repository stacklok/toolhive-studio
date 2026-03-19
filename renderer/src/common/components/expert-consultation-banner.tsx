import { type SubmitEvent, useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMatches } from '@tanstack/react-router'
import { Loader2, X } from 'lucide-react'
import { z } from 'zod/v4'
import * as Sentry from '@sentry/electron/renderer'
import log from 'electron-log/renderer'
import { getApiV1BetaWorkloadsOptions } from '@common/api/generated/@tanstack/react-query.gen'
import type { GithubComStacklokToolhivePkgCoreWorkload } from '@common/api/generated/types.gen'
import { trackEvent } from '../lib/analytics'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Checkbox } from './ui/checkbox'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'

const HUBSPOT_PORTAL_ID = '42544743'
const HUBSPOT_FORM_ID = '5f1a7a2c-5069-44b7-9444-d952c55ce89c'
const DISMISS_DAYS = 30
const MIN_SERVERS_IN_GROUP = 3
const PRIVACY_POLICY_URL = 'https://www.iubenda.com/privacy-policy/29074746'

const CONSENT_PROCESSING_TEXT =
  'In order to provide you the content requested, we need to store and process your personal data. If you consent to us storing your personal data for this purpose, please tick the checkbox below.'

function shouldShowBanner(submitted: boolean, dismissedAt: string): boolean {
  if (submitted) return false
  if (!dismissedAt) return true

  const dismissed = new Date(dismissedAt).getTime()
  if (Number.isNaN(dismissed)) return true

  const daysSinceDismissal = (Date.now() - dismissed) / (1000 * 60 * 60 * 24)
  return daysSinceDismissal >= DISMISS_DAYS
}

function hasGroupWithEnoughServers(
  workloads: GithubComStacklokToolhivePkgCoreWorkload[]
): boolean {
  const groupCounts = new Map<string, number>()
  for (const w of workloads) {
    const group = w.group ?? 'default'
    groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1)
  }
  for (const count of groupCounts.values()) {
    if (count > MIN_SERVERS_IN_GROUP) return true
  }
  return false
}

async function submitToHubSpot(
  fields: {
    firstname: string
    lastname: string
    email: string
    company: string
    message: string
  },
  consentToProcess: boolean
): Promise<string | undefined> {
  const response = await fetch(
    `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_FORM_ID}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: [
          { name: 'firstname', value: fields.firstname },
          { name: 'lastname', value: fields.lastname },
          { name: 'email', value: fields.email },
          { name: 'company', value: fields.company },
          { name: 'message', value: fields.message },
        ],
        context: {
          pageName: 'ToolHive Desktop - Expert Consultation',
        },
        legalConsentOptions: {
          consent: {
            consentToProcess,
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

const formSchema = z.object({
  firstname: z.string().min(1, 'First name is required'),
  lastname: z.string().min(1, 'Last name is required'),
  email: z.email('Please enter a valid email address'),
  company: z.string().optional().default(''),
  message: z.string().optional().default(''),
})

function ExpertConsultationDialog({
  successMessage,
  onSubmitted,
  onDismiss,
  onClose,
}: {
  successMessage: string
  onSubmitted: (message: string) => void
  onDismiss: () => void
  onClose: () => void
}) {
  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [consentToProcess, setConsentToProcess] = useState(false)

  useEffect(() => {
    trackEvent('Expert consultation modal shown')
  }, [])

  const { mutate: submit, isPending: isSubmitting } = useMutation({
    mutationFn: async (fields: {
      firstname: string
      lastname: string
      email: string
      company: string
      message: string
    }) => {
      const inlineMessage = await submitToHubSpot(fields, consentToProcess)
      await window.electronAPI.setExpertConsultationSubmitted(true)
      return inlineMessage
    },
    onSuccess: (inlineMessage) => {
      onSubmitted(
        inlineMessage ?? 'Thanks for reaching out! We will be in touch shortly.'
      )
      trackEvent('Expert consultation submitted')
    },
    onError: (err: unknown) => {
      setErrors({ form: 'error' })
      log.error('[ExpertConsultation] HubSpot submission failed:', err)
      Sentry.captureException(err, {
        tags: { feature: 'expert-consultation' },
      })
      trackEvent('Expert consultation submission failed', {
        'error.message': err instanceof Error ? err.message : String(err),
      })
    },
  })

  const { mutate: dismiss } = useMutation({
    mutationFn: () =>
      window.electronAPI.setExpertConsultationDismissedAt(
        new Date().toISOString()
      ),
    onSuccess: () => {
      trackEvent('Expert consultation dismissed')
      onDismiss()
    },
  })

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault()
    const result = formSchema.safeParse({
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      email: email.trim(),
      company: company.trim(),
      message: message.trim(),
    })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0]
        if (typeof field === 'string' && !fieldErrors[field]) {
          fieldErrors[field] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    submit(result.data)
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          if (successMessage) {
            onClose()
          } else {
            dismiss()
          }
        }
      }}
    >
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        className="bg-brand-blue-light text-brand-blue-dark
          dark:bg-brand-blue-light dark:text-brand-blue-dark
          **:data-[slot=dialog-close]:text-brand-blue-dark
          border-brand-blue-mid/20 p-8 **:data-[slot=dialog-close]:opacity-70
          sm:max-w-md"
      >
        {successMessage ? (
          <DialogHeader>
            <DialogTitle
              className="text-brand-blue-mid font-serif text-3xl font-light"
            >
              Success!
            </DialogTitle>
            <DialogDescription className="text-primary">
              {successMessage}
            </DialogDescription>
          </DialogHeader>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle
                className="text-brand-blue-mid font-serif text-3xl font-light"
              >
                Request a demo
              </DialogTitle>
              <DialogDescription className="text-primary">
                Get a 30-minute walkthrough of registry curation, auth, gateway
                setup, and more. Tailored to your priorities.
              </DialogDescription>
            </DialogHeader>
            <form
              noValidate
              onSubmit={handleSubmit}
              className="flex flex-col gap-3"
            >
              {errors.form && (
                <p className="text-sm text-red-600">
                  Something went wrong. Please try submitting via{' '}
                  <a
                    href="https://stacklok.com/demo/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    stacklok.com/demo
                  </a>
                  .
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Input
                    placeholder="First name *"
                    value={firstname}
                    onChange={(e) => {
                      setFirstname(e.target.value)
                      if (errors.firstname)
                        setErrors((prev) => ({ ...prev, firstname: '' }))
                    }}
                    aria-invalid={!!errors.firstname}
                    disabled={isSubmitting}
                    className="border-brand-blue-mid/20 bg-background
                      text-foreground placeholder:text-brand-blue-dark/40"
                  />
                  {errors.firstname && (
                    <p className="text-sm text-red-600">{errors.firstname}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Input
                    placeholder="Last name *"
                    value={lastname}
                    onChange={(e) => {
                      setLastname(e.target.value)
                      if (errors.lastname)
                        setErrors((prev) => ({ ...prev, lastname: '' }))
                    }}
                    aria-invalid={!!errors.lastname}
                    disabled={isSubmitting}
                    className="border-brand-blue-mid/20 bg-background
                      text-foreground placeholder:text-brand-blue-dark/40"
                  />
                  {errors.lastname && (
                    <p className="text-sm text-red-600">{errors.lastname}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Input
                  placeholder="Company name"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  disabled={isSubmitting}
                  className="border-brand-blue-mid/20 bg-background
                    text-foreground placeholder:text-brand-blue-dark/40"
                />
              </div>

              <div className="flex flex-col gap-1">
                <Input
                  type="email"
                  placeholder="Email *"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (errors.email)
                      setErrors((prev) => ({ ...prev, email: '' }))
                  }}
                  aria-invalid={!!errors.email}
                  disabled={isSubmitting}
                  className="border-brand-blue-mid/20 bg-background
                    text-foreground placeholder:text-brand-blue-dark/40"
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <Textarea
                  placeholder="Is there anything you would like us to know?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isSubmitting}
                  className="border-brand-blue-mid/20 bg-background
                    text-foreground placeholder:text-brand-blue-dark/40 min-h-20
                    resize-none"
                />
              </div>

              <label className="flex cursor-pointer items-start gap-2.5">
                <Checkbox
                  checked={consentToProcess}
                  onCheckedChange={(checked) =>
                    setConsentToProcess(checked === true)
                  }
                  disabled={isSubmitting}
                  required
                  className="border-brand-blue-dark/40 mt-0.5 shrink-0"
                />
                <span className="text-xs leading-relaxed">
                  I agree to allow Stacklok to store and process my personal
                  data.{' '}
                  <span className="text-brand-blue-dark/60">(required)</span>
                </span>
              </label>

              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !firstname.trim() ||
                  !lastname.trim() ||
                  !email.trim() ||
                  !consentToProcess
                }
                className="bg-brand-blue-dark text-brand-blue-light
                  hover:bg-brand-blue-dark/90 rounded-full"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Submit'}
              </Button>

              <p className="text-brand-blue-dark/50 text-xs leading-relaxed">
                By submitting this form, you agree to our{' '}
                <a
                  href={PRIVACY_POLICY_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  Privacy Policy
                </a>
                .
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function ExpertConsultationBanner() {
  const matches = useMatches()
  const isGroupRoute = matches.some((m) => m.routeId === '/group/$groupName')

  const [closed, setClosed] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const queryClient = useQueryClient()

  const { data: consultationState, isLoading: isConsultationLoading } =
    useQuery({
      queryKey: ['expert-consultation-state'],
      queryFn: () => window.electronAPI.getExpertConsultationState(),
    })

  const { data: newsletterState, isLoading: isNewsletterLoading } = useQuery({
    queryKey: ['newsletter-state'],
    queryFn: () => window.electronAPI.getNewsletterState(),
  })

  const { data: workloadsData, isLoading: isWorkloadsLoading } = useQuery({
    ...getApiV1BetaWorkloadsOptions({ query: { all: true } }),
  })

  const { mutate: dismiss } = useMutation({
    mutationFn: () =>
      window.electronAPI.setExpertConsultationDismissedAt(
        new Date().toISOString()
      ),
    onSuccess: () => {
      trackEvent('Expert consultation banner dismissed')
      queryClient.invalidateQueries({
        queryKey: ['expert-consultation-state'],
      })
    },
  })

  if (modalOpen) {
    return (
      <ExpertConsultationDialog
        successMessage={successMessage}
        onSubmitted={(msg) => setSuccessMessage(msg)}
        onDismiss={() => {
          setModalOpen(false)
          setClosed(true)
          queryClient.invalidateQueries({
            queryKey: ['expert-consultation-state'],
          })
        }}
        onClose={() => {
          setModalOpen(false)
          setClosed(true)
          setSuccessMessage('')
          queryClient.invalidateQueries({
            queryKey: ['expert-consultation-state'],
          })
        }}
      />
    )
  }

  const isDataReady =
    !isConsultationLoading &&
    !isNewsletterLoading &&
    !isWorkloadsLoading &&
    !!consultationState &&
    !!newsletterState

  const isEligible =
    isDataReady &&
    shouldShowBanner(consultationState.submitted, consultationState.dismissedAt)

  const isNewsletterModalVisible =
    isDataReady && !newsletterState.subscribed && !newsletterState.dismissedAt

  const workloads = workloadsData?.workloads ?? []
  const hasEnoughServers = hasGroupWithEnoughServers(workloads)

  const shouldRender =
    isGroupRoute &&
    !closed &&
    isEligible &&
    !isNewsletterModalVisible &&
    hasEnoughServers

  if (!shouldRender) return null

  return (
    <div
      className="fixed bottom-6 left-6 z-40 w-96"
      data-testid="expert-consultation-banner"
    >
      <div
        className="bg-brand-green-mid relative overflow-clip rounded-xl p-6
          shadow-lg"
      >
        <button
          type="button"
          onClick={() => {
            dismiss()
            setClosed(true)
          }}
          aria-label="Close"
          className="text-primary-foreground/50 hover:text-primary-foreground
            absolute top-5 right-5"
        >
          <X className="size-4" />
        </button>

        <div className="flex flex-col gap-1">
          <h3
            className="text-primary-foreground pr-6 font-serif text-[26px]
              leading-[31px] font-light tracking-tight"
          >
            What&apos;s standing between your MCP setup and production?
          </h3>
          <p className="text-brand-green-light text-sm leading-5">
            Whether it&apos;s identity, auth, policy-as-code, or runtime
            governance, we can help you get there.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setModalOpen(true)}
          className="bg-brand-green-dark text-primary-foreground
            hover:bg-brand-green-dark/90 mt-3 rounded-full font-medium"
        >
          Talk to an Expert
        </Button>
      </div>
    </div>
  )
}
