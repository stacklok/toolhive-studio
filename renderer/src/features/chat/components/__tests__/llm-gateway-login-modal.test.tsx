import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LlmGatewayLoginModal } from '../llm-gateway-login-modal'

describe('LlmGatewayLoginModal', () => {
  it('shows the sign-in prompt and optional message', () => {
    render(
      <LlmGatewayLoginModal
        open
        onOpenChange={vi.fn()}
        onRetry={vi.fn()}
        message="Complete sign-in in your browser"
      />
    )

    expect(
      screen.getByRole('heading', { name: /sign in to stacklok gateway/i })
    ).toBeVisible()
    expect(screen.getByText('Complete sign-in in your browser')).toBeVisible()
  })

  it('calls onRetry when the user completed sign-in', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    render(
      <LlmGatewayLoginModal open onOpenChange={vi.fn()} onRetry={onRetry} />
    )

    await user.click(
      screen.getByRole('button', { name: /i completed sign-in/i })
    )
    expect(onRetry).toHaveBeenCalled()
  })

  it('disables retry while checking', () => {
    render(
      <LlmGatewayLoginModal
        open
        onOpenChange={vi.fn()}
        onRetry={vi.fn()}
        isRetrying
      />
    )

    expect(screen.getByRole('button', { name: /checking/i })).toBeDisabled()
  })

  it('closes on cancel', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    render(
      <LlmGatewayLoginModal
        open
        onOpenChange={onOpenChange}
        onRetry={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
