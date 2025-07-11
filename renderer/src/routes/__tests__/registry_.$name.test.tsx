import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { RegistryServerDetail } from '@/routes/(registry)/registry_.$name'
import { createTestRouter } from '@/common/test/create-test-router'
import { renderRoute } from '@/common/test/render-route'
import userEvent from '@testing-library/user-event'

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    useParams: () => ({ name: 'time' }),
  }
})

function WrapperComponent() {
  return (
    <>
      <RegistryServerDetail />{' '}
    </>
  )
}

describe('Registry Server Detail Route', () => {
  it('displays server details correctly', async () => {
    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'time' })).toBeVisible()
    })

    expect(screen.getByRole('button', { name: /back/i })).toBeVisible()
    expect(
      screen.getByRole('button', {
        name: /provenance signed by sigstore/i,
      })
    ).toBeVisible()
    expect(screen.getByText(/official/i)).toBeVisible()
    expect(screen.getByText(/stdio/i)).toBeVisible()
    expect(screen.getByText(/52,153/i)).toBeVisible()
    expect(screen.getByText(/get_current_time/i)).toBeVisible()
    expect(screen.getByText(/convert_time/i)).toBeVisible()
    expect(
      screen.getByRole('button', { name: /install server/i })
    ).toBeVisible()

    expect(screen.getByRole('button', { name: /github/i })).toBeVisible()
  })

  it('has a back button that navigates to root route', async () => {
    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'time' })).toBeVisible()
    })

    const backButton = screen.getByRole('button', { name: /back/i })
    expect(backButton).toBeVisible()
    expect(backButton.closest('a')).toHaveAttribute('href', '/registry')

    await userEvent.click(backButton)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/registry')
    })
  })

  it('launches dialog with form when clicking on Install server', async () => {
    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'time' })).toBeVisible()
    })
    await userEvent.click(
      screen.getByRole('button', { name: /install server/i })
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
      expect(screen.getByText(`Configure time`)).toBeVisible()
    })

    expect(
      screen.getByLabelText('Server name', { selector: 'input' })
    ).toBeVisible()

    expect(
      screen.getByLabelText('Secrets', { selector: 'input' })
    ).toBeVisible()
    expect(
      screen.getByLabelText('Environment variables', { selector: 'input' })
    ).toBeVisible()
  })
})
