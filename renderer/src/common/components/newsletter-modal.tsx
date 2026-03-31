import { type SubmitEvent, useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { z } from 'zod/v4'
import * as Sentry from '@sentry/electron/renderer'
import log from 'electron-log/renderer'
import { trackEvent } from '../lib/analytics'
import { shouldShowAfterDismissal } from '../lib/hubspot'
import { useHubSpotForm } from '../hooks/use-hubspot-form'
import { useNewsletterModal } from '../contexts/newsletter-modal-context'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'
import {
  HubSpotDialogContent,
  SuccessDialogContent,
  ConsentCheckbox,
  PrivacyFooter,
} from './hubspot-form-parts'

const HUBSPOT_FORM_ID = '8f75a6a3-bf6d-4cd0-8da5-0092ecfda250'
const DISMISS_DAYS = 15

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

  const { consentToProcess, setConsentToProcess, isReady, submit } =
    useHubSpotForm(HUBSPOT_FORM_ID, 'ToolHive Desktop - Newsletter Signup')

  useEffect(() => {
    trackEvent('Newsletter modal shown')
  }, [])

  const { mutate: subscribe, isPending: isSubmitting } = useMutation({
    mutationFn: async (emailValue: string) => {
      const inlineMessage = await submit([{ name: 'email', value: emailValue }])
      await window.electronAPI.setNewsletterSubscribed(true)
      return inlineMessage
    },
    onSuccess: (inlineMessage) => {
      onSubscribed(inlineMessage ?? 'Thanks for subscribing!')
      trackEvent('Newsletter subscribed')
    },
    onError: (err: unknown) => {
      setError('Something went wrong. Please try again.')
      log.error('[Newsletter] HubSpot submission failed:', err)
      Sentry.captureException(err, {
        tags: { feature: 'newsletter' },
      })
      trackEvent('Newsletter subscription failed', {
        'error.message': err instanceof Error ? err.message : String(err),
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
      <HubSpotDialogContent>
        {successMessage ? (
          <SuccessDialogContent message={successMessage} />
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
              className="flex flex-col gap-4"
            >
              <ConsentCheckbox
                checked={consentToProcess}
                onCheckedChange={setConsentToProcess}
                disabled={isSubmitting}
              />

              <div className="flex flex-col gap-1.5">
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
                      text-foreground placeholder:text-brand-blue-dark/40
                      flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={
                      !isReady ||
                      isSubmitting ||
                      !email.trim() ||
                      !consentToProcess
                    }
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
              </div>

              <PrivacyFooter>
                You can unsubscribe at any time. For more information on how to
                unsubscribe and our privacy practices, please review our
              </PrivacyFooter>
            </form>
          </>
        )}
      </HubSpotDialogContent>
    </Dialog>
  )
}

export function NewsletterModal() {
  const [closed, setClosed] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const queryClient = useQueryClient()
  const { forceOpen, closeNewsletterModal } = useNewsletterModal()

  const { data: newsletterState, isLoading } = useQuery({
    queryKey: ['newsletter-state'],
    queryFn: () => window.electronAPI.getNewsletterState(),
  })

  if (isLoading || !newsletterState) return null

  if (!forceOpen) {
    if (closed) return null
    if (
      !successMessage &&
      !shouldShowAfterDismissal(
        newsletterState.subscribed,
        newsletterState.dismissedAt,
        DISMISS_DAYS
      )
    ) {
      return null
    }
  }

  return (
    <NewsletterDialog
      successMessage={successMessage}
      onSubscribed={(message) => setSuccessMessage(message)}
      onDismiss={() => {
        closeNewsletterModal()
        queryClient.invalidateQueries({ queryKey: ['newsletter-state'] })
      }}
      onClose={() => {
        closeNewsletterModal()
        setClosed(true)
      }}
    />
  )
}
