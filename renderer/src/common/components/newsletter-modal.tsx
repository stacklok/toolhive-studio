import { type SubmitEvent, useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { z } from 'zod/v4'
import * as Sentry from '@sentry/electron/renderer'
import log from 'electron-log/renderer'
import { trackEvent } from '../lib/analytics'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'

const HUBSPOT_PORTAL_ID = '42544743'
const HUBSPOT_FORM_ID = '8f75a6a3-bf6d-4cd0-8da5-0092ecfda250'
const DISMISS_DAYS = 15

function shouldShowModal(subscribed: boolean, dismissedAt: string): boolean {
  if (subscribed) return false
  if (!dismissedAt) return true

  const dismissed = new Date(dismissedAt).getTime()
  const now = Date.now()
  const daysSinceDismissal = (now - dismissed) / (1000 * 60 * 60 * 24)
  return daysSinceDismissal >= DISMISS_DAYS
}

async function submitToHubSpot(email: string): Promise<string | undefined> {
  const response = await fetch(
    `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_FORM_ID}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: [{ name: 'email', value: email }],
        context: {
          pageName: 'ToolHive Desktop - Newsletter Signup',
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
    return typeof data?.inlineMessage === 'string'
      ? data.inlineMessage
      : undefined
  } catch {
    return undefined
  }
}

const emailSchema = z.email('Please enter a valid email address')

function NewsletterDialog({
  successMessage,
  onSubscribed,
  onDismiss,
  onClose,
}: {
  successMessage: string
  onSubscribed: (message: string) => void
  onDismiss: () => void
  onClose: () => void
}) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    trackEvent('Newsletter modal shown')
  }, [])

  const { mutate: subscribe, isPending: isSubmitting } = useMutation({
    mutationFn: async (emailValue: string) => {
      const inlineMessage = await submitToHubSpot(emailValue)
      await window.electronAPI.setNewsletterSubscribed(true)
      return inlineMessage
    },
    onSuccess: (inlineMessage) => {
      onSubscribed(inlineMessage ?? 'Thanks for subscribing!')
      trackEvent('Newsletter subscribed')
    },
    onError: (err) => {
      setError('Something went wrong. Please try again.')
      log.error('[Newsletter] HubSpot submission failed:', err)
      Sentry.captureException(err, {
        tags: { feature: 'newsletter' },
      })
      trackEvent('Newsletter subscription failed', {
        'error.message': err.message,
      })
    },
  })

  const { mutate: dismiss } = useMutation({
    mutationFn: () =>
      window.electronAPI.setNewsletterDismissedAt(new Date().toISOString()),
    onSuccess: () => {
      trackEvent('Newsletter dismissed')
      onDismiss()
    },
  })

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault()
    const result = emailSchema.safeParse(email.trim())
    if (!result.success) {
      setError(
        result.error.issues[0]?.message ?? 'Please enter a valid email address'
      )
      return
    }
    setError('')
    subscribe(result.data)
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
              Thank you!
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
                Stay up to date with improvements to ToolHive
              </DialogTitle>
              <DialogDescription className="text-primary">
                Subscribe to our quarterly email showing you all the new product
                improvements to ToolHive
              </DialogDescription>
            </DialogHeader>
            <form
              noValidate
              onSubmit={handleSubmit}
              className="flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError('')
                  }}
                  aria-invalid={!!error}
                  disabled={isSubmitting}
                  className="border-brand-blue-mid/20 bg-background
                    text-foreground placeholder:text-brand-blue-dark/40 flex-1"
                />
                <Button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="bg-brand-blue-dark text-brand-blue-light
                    hover:bg-brand-blue-dark/90 rounded-full"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    'Sign up'
                  )}
                </Button>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function NewsletterModal() {
  const [closed, setClosed] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const queryClient = useQueryClient()

  const { data: newsletterState, isLoading } = useQuery({
    queryKey: ['newsletter-state'],
    queryFn: () => window.electronAPI.getNewsletterState(),
  })

  if (closed || isLoading || !newsletterState) return null

  if (
    !successMessage &&
    !shouldShowModal(newsletterState.subscribed, newsletterState.dismissedAt)
  ) {
    return null
  }

  return (
    <NewsletterDialog
      successMessage={successMessage}
      onSubscribed={(message) => setSuccessMessage(message)}
      onDismiss={() => {
        queryClient.invalidateQueries({ queryKey: ['newsletter-state'] })
      }}
      onClose={() => setClosed(true)}
    />
  )
}
