import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { LogsPage } from '../index'
import { createTestRouter } from '@/common/test/create-test-router'
import { renderRoute } from '@/common/test/render-route'

describe('LogsPage Component', () => {
  describe('Loading State - Skeleton', () => {
    it('displays skeleton while loading logs', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})

      const router = createTestRouter(LogsPage, '/logs/$groupName/$serverName')
      router.navigate({
        to: '/logs/$groupName/$serverName',
        params: { serverName: 'test-server', groupName: 'default' },
      })
      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByTestId('skeleton-logs')).toBeVisible()
      })
    })
  })

  describe('Basic Rendering', () => {
    it('displays server name as heading for regular server', async () => {
      const router = createTestRouter(LogsPage, '/logs/$groupName/$serverName')
      router.navigate({
        to: '/logs/$groupName/$serverName',
        params: { serverName: 'test-server', groupName: 'default' },
      })
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'test-server' })
        ).toBeVisible()
      })
    })

    it('renders search input', async () => {
      const router = createTestRouter(LogsPage, '/logs/$groupName/$serverName')
      router.navigate({
        to: '/logs/$groupName/$serverName',
        params: { serverName: 'test-server', groupName: 'default' },
      })
      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search log')).toBeVisible()
      })
    })

    it('renders back button with correct link', async () => {
      const router = createTestRouter(LogsPage, '/logs/$groupName/$serverName')
      router.navigate({
        to: '/logs/$groupName/$serverName',
        params: { serverName: 'test-server', groupName: 'production' },
      })
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'test-server' })
        ).toBeVisible()
      })

      const backButton = screen.getByRole('button', { name: /back/i })
      expect(backButton.closest('a')).toHaveAttribute(
        'href',
        '/group/production'
      )
    })
  })
})
