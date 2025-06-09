import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Clients } from '../clients'
import { createTestRouter } from '@/common/test/create-test-router'
import { renderRoute } from '@/common/test/render-route'

const router = createTestRouter(Clients)

describe('Clients Route', () => {
  it('should render the page', async () => {
    renderRoute(router)

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: /enable all clients/i,
        })
      ).toBeVisible()
    })

    expect(
      screen.getByRole('heading', { name: /clients/i })
    ).toBeInTheDocument()

    expect(screen.getByText('vscode')).toBeInTheDocument()
    expect(screen.getByText('cursor')).toBeInTheDocument()
    expect(screen.getByText('claude-code')).toBeInTheDocument()
    expect(screen.getAllByRole('switch')).toHaveLength(6)
  })
})
