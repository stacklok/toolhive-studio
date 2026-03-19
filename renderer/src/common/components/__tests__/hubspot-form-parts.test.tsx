import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { PRIVACY_POLICY_URL } from '@/common/lib/hubspot'
import { Dialog } from '../ui/dialog'
import {
  SuccessDialogContent,
  ConsentCheckbox,
  PrivacyFooter,
} from '../hubspot-form-parts'

describe('SuccessDialogContent', () => {
  it('renders the success title and message', () => {
    render(
      <Dialog open>
        <SuccessDialogContent message="Thanks for reaching out!" />
      </Dialog>
    )

    expect(screen.getByText('Success!')).toBeInTheDocument()
    expect(screen.getByText('Thanks for reaching out!')).toBeInTheDocument()
  })
})

describe('ConsentCheckbox', () => {
  it('renders the consent label text', () => {
    render(
      <ConsentCheckbox
        checked={false}
        onCheckedChange={() => {}}
        disabled={false}
      />
    )

    expect(
      screen.getByText(
        /I agree to allow Stacklok to store and process my personal data/
      )
    ).toBeInTheDocument()
    expect(screen.getByText('(required)')).toBeInTheDocument()
  })

  it('calls onCheckedChange when clicked', async () => {
    const onChange = vi.fn()
    render(
      <ConsentCheckbox
        checked={false}
        onCheckedChange={onChange}
        disabled={false}
      />
    )

    await userEvent.click(
      screen.getByRole('checkbox', {
        name: /store and process my personal data/i,
      })
    )

    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('renders as disabled when disabled prop is true', () => {
    render(
      <ConsentCheckbox
        checked={false}
        onCheckedChange={() => {}}
        disabled={true}
      />
    )

    expect(
      screen.getByRole('checkbox', {
        name: /store and process my personal data/i,
      })
    ).toBeDisabled()
  })

  it('reflects checked state', () => {
    render(
      <ConsentCheckbox
        checked={true}
        onCheckedChange={() => {}}
        disabled={false}
      />
    )

    expect(
      screen.getByRole('checkbox', {
        name: /store and process my personal data/i,
      })
    ).toBeChecked()
  })
})

describe('PrivacyFooter', () => {
  it('renders children text and privacy policy link', () => {
    render(
      <PrivacyFooter>By submitting this form, you agree to our</PrivacyFooter>
    )

    expect(
      screen.getByText(/By submitting this form, you agree to our/)
    ).toBeInTheDocument()

    const link = screen.getByRole('link', { name: /privacy policy/i })
    expect(link).toHaveAttribute('href', PRIVACY_POLICY_URL)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })

  it('renders different children text (newsletter variant)', () => {
    render(
      <PrivacyFooter>
        You can unsubscribe at any time. For more information on how to
        unsubscribe and our privacy practices, please review our
      </PrivacyFooter>
    )

    expect(
      screen.getByText(/You can unsubscribe at any time/)
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /privacy policy/i })
    ).toBeInTheDocument()
  })
})
