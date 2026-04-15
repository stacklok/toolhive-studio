import type { JSX } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import { PERMISSION_KEYS } from '@/common/contexts/permissions/permission-keys'

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/common/components/not-found', () => ({
  NotFound: () => <div data-testid="not-found" />,
}))

// ---------------------------------------------------------------------------
// Route import (after mocks are registered)
// ---------------------------------------------------------------------------

import { Route as PlaygroundRoute } from '../playground'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPlayground(permissions: Record<string, boolean> = {}) {
  const PlaygroundComponent = PlaygroundRoute.options
    .component as () => JSX.Element
  const router = createTestRouter(() => <PlaygroundComponent />, '/playground')
  return renderRoute(router, { permissions })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Playground layout route', () => {
  describe('permission gate', () => {
    it('renders NotFound when playground permission is denied', async () => {
      renderPlayground({ [PERMISSION_KEYS.PLAYGROUND_MENU]: false })
      await waitFor(() =>
        expect(screen.getByTestId('not-found')).toBeInTheDocument()
      )
    })

    it('renders nothing (Outlet) when permission is granted', async () => {
      renderPlayground({ [PERMISSION_KEYS.PLAYGROUND_MENU]: true })
      await waitFor(() =>
        expect(screen.queryByTestId('not-found')).not.toBeInTheDocument()
      )
    })
  })
})
