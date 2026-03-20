import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RegistryError } from '../registry-error'
import { REGISTRY_AUTH_REQUIRED_UI_MESSAGE } from '../../settings/registry/registry-list-error'
import { createTestRouter } from '@/common/test/create-test-router'
import { renderRoute } from '@/common/test/render-route'

function renderRegistryError(error: unknown) {
  const router = createTestRouter(() => <RegistryError error={error} />)
  return renderRoute(router)
}

describe('RegistryError', () => {
  describe('registry_auth_required error', () => {
    it('shows authentication required title and message', async () => {
      renderRegistryError({ code: 'registry_auth_required' })

      await waitFor(() => {
        expect(screen.getByText('Authentication required')).toBeVisible()
      })
      expect(screen.getByText(REGISTRY_AUTH_REQUIRED_UI_MESSAGE)).toBeVisible()
    })

    it('renders Registry Settings and Try Again buttons', async () => {
      renderRegistryError({ code: 'registry_auth_required' })

      await waitFor(() => {
        expect(screen.getByText('Authentication required')).toBeVisible()
      })
      expect(screen.getByText('Registry Settings')).toBeVisible()
      expect(screen.getByRole('button', { name: /Try Again/i })).toBeVisible()
    })

    it('does not show generic error message or Discord link', async () => {
      renderRegistryError({ code: 'registry_auth_required' })

      await waitFor(() => {
        expect(screen.getByText('Authentication required')).toBeVisible()
      })
      expect(
        screen.queryByText(/something went wrong while loading the registry/i)
      ).not.toBeInTheDocument()
      expect(screen.queryByText('Discord')).not.toBeInTheDocument()
    })
  })

  describe('generic error', () => {
    it('shows failed to load registry title and generic message', async () => {
      renderRegistryError(new Error('network error'))

      await waitFor(() => {
        expect(screen.getByText('Failed to load registry')).toBeVisible()
      })
      expect(
        screen.getByText(/something went wrong while loading the registry/i)
      ).toBeVisible()
    })

    it('renders Discord link, Try Again and Registry Settings buttons', async () => {
      renderRegistryError({ code: 'other_error' })

      await waitFor(() => {
        expect(screen.getByText('Failed to load registry')).toBeVisible()
      })
      expect(screen.getByText('Discord')).toBeVisible()
      expect(screen.getByRole('button', { name: /Try Again/i })).toBeVisible()
      expect(screen.getByText('Registry Settings')).toBeVisible()
    })

    it('does not show authentication required content', async () => {
      renderRegistryError(new Error('some error'))

      await waitFor(() => {
        expect(screen.getByText('Failed to load registry')).toBeVisible()
      })
      expect(
        screen.queryByText('Authentication required')
      ).not.toBeInTheDocument()
      expect(
        screen.queryByText(REGISTRY_AUTH_REQUIRED_UI_MESSAGE)
      ).not.toBeInTheDocument()
    })
  })
})
