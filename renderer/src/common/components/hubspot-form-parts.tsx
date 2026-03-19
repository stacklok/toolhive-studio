import type { ReactNode } from 'react'
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Checkbox } from './ui/checkbox'
import { PRIVACY_POLICY_URL } from '../lib/hubspot'

export function HubSpotDialogContent({ children }: { children: ReactNode }) {
  return (
    <DialogContent
      onInteractOutside={(e) => e.preventDefault()}
      className="bg-brand-blue-light text-brand-blue-dark
        dark:bg-brand-blue-light dark:text-brand-blue-dark
        **:data-[slot=dialog-close]:text-brand-blue-dark
        border-brand-blue-mid/20 p-8 **:data-[slot=dialog-close]:opacity-70
        sm:max-w-md"
    >
      {children}
    </DialogContent>
  )
}

export function SuccessDialogContent({ message }: { message: string }) {
  return (
    <DialogHeader>
      <DialogTitle
        className="text-brand-blue-mid font-serif text-3xl font-light"
      >
        Success!
      </DialogTitle>
      <DialogDescription className="text-primary">{message}</DialogDescription>
    </DialogHeader>
  )
}

export function ConsentCheckbox({
  checked,
  onCheckedChange,
  disabled,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled: boolean
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        disabled={disabled}
        required
        className="border-brand-blue-dark/40 mt-0.5 shrink-0"
      />
      <span className="text-xs leading-relaxed">
        I agree to allow Stacklok to store and process my personal data.{' '}
        <span className="text-brand-blue-dark/60">(required)</span>
      </span>
    </label>
  )
}

export function PrivacyFooter({ children }: { children: ReactNode }) {
  return (
    <p className="text-brand-blue-dark/50 text-xs leading-relaxed">
      {children}{' '}
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
  )
}
