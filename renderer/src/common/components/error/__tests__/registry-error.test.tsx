import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RegistryError } from '../registry-error'
import {
  REGISTRY_AUTH_REQUIRED_UI_MESSAGE,
  REGISTRY_UNAVAILABLE_UI_MESSAGE,
} from '../../settings/registry/registry-errors'
import { createTestRouter } from '@/common/test/create-test-router'
import { renderRoute } from '@/common/test/render-route'

function renderRegistryError(error: unknown) {
  const router = createTestRouter(() => <RegistryError error={error} />)
  return renderRoute(router)
}

describe('RegistryError', () => {
  describe('registry_auth_required error', () => {
    it('shows authentication error title and message', async () => {
      renderRegistryError({ code: 'registry_auth_required' })

      await waitFor(() => {
        expect(screen.getByText('Authentication error')).toBeVisible()
      })
      expect(screen.getByText(REGISTRY_AUTH_REQUIRED_UI_MESSAGE)).toBeVisible()
    })

    it('renders Resolve issues button', async () => {
      renderRegistryError({ code: 'registry_auth_required' })

      await waitFor(() => {
        expect(screen.getByText('Authentication error')).toBeVisible()
      })
      expect(screen.getByText('Resolve issues')).toBeVisible()
    })

    it('does not show generic error message or Discord link', async () => {
      renderRegistryError({ code: 'registry_auth_required' })

      await waitFor(() => {
        expect(screen.getByText('Authentication error')).toBeVisible()
      })
      expect(
        screen.queryByText(/something went wrong while loading the registry/i)
      ).not.toBeInTheDocument()
      expect(screen.queryByText('Discord')).not.toBeInTheDocument()
    })
  })

  describe('registry_unavailable error', () => {
    it('shows registry unavailable title and message', async () => {
      renderRegistryError({
        code: 'registry_unavailable',
        message: 'upstream registry at https://example.com is unavailable: 404',
      })

      await waitFor(() => {
        expect(screen.getByText('Registry unavailable')).toBeVisible()
      })
      expect(screen.getByText(REGISTRY_UNAVAILABLE_UI_MESSAGE)).toBeVisible()
    })

    it('renders Resolve issues button', async () => {
      renderRegistryError({
        code: 'registry_unavailable',
        message: 'upstream registry at https://example.com is unavailable: 404',
      })

      await waitFor(() => {
        expect(screen.getByText('Registry unavailable')).toBeVisible()
      })
      expect(screen.getByText('Resolve issues')).toBeVisible()
    })

    it('does not show auth error or generic error content', async () => {
      renderRegistryError({
        code: 'registry_unavailable',
        message: 'upstream registry at https://example.com is unavailable: 404',
      })

      await waitFor(() => {
        expect(screen.getByText('Registry unavailable')).toBeVisible()
      })
      expect(screen.queryByText('Authentication error')).not.toBeInTheDocument()
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

    it('renders Discord link and Resolve issues button', async () => {
      renderRegistryError({ code: 'other_error' })

      await waitFor(() => {
        expect(screen.getByText('Failed to load registry')).toBeVisible()
      })
      expect(screen.getByText('Discord')).toBeVisible()
      expect(screen.getByText('Resolve issues')).toBeVisible()
    })

    it('does not show authentication or unavailable content', async () => {
      renderRegistryError(new Error('some error'))

      await waitFor(() => {
        expect(screen.getByText('Failed to load registry')).toBeVisible()
      })
      expect(screen.queryByText('Authentication error')).not.toBeInTheDocument()
      expect(screen.queryByText('Registry unavailable')).not.toBeInTheDocument()
      expect(
        screen.queryByText(REGISTRY_AUTH_REQUIRED_UI_MESSAGE)
      ).not.toBeInTheDocument()
    })
  })
})
