import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Index } from '../index'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'

const router = createTestRouter(Index)

beforeEach(() => {
  vi.clearAllMocks()

  Object.defineProperty(window, 'electronAPI', {
    value: {
      featureFlags: {
        get: vi.fn().mockResolvedValue(true), // enable GROUPS sidebar
      },
      shutdownStore: {
        getLastShutdownServers: vi.fn().mockResolvedValue([]),
        clearShutdownHistory: vi.fn().mockResolvedValue(undefined),
      },
      onServerShutdown: vi.fn().mockReturnValue(() => {}),
    },
    writable: true,
  })
})

describe('Groups Manager in Index route (feature flagged)', () => {
  it('renders the groups sidebar with all groups', async () => {
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('Default group')).toBeVisible()
      expect(screen.getByText('Research team')).toBeVisible()
      expect(screen.getByText('Archive')).toBeVisible()
    })
  })

  it('marks the Default group as active with correct styling', async () => {
    renderRoute(router)

    const defaultGroup = await screen.findByText('Default group')
    const groupItem = defaultGroup.closest('div')!.parentElement as HTMLElement

    expect(groupItem).toHaveClass('rounded-md')
    expect(groupItem).toHaveClass('border', 'border-input')
    expect(groupItem).toHaveClass('bg-background')
    expect(groupItem).toHaveClass('shadow-sm')

    expect(groupItem).toHaveClass('flex', 'h-9', 'w-[215px]', 'px-4', 'py-2')
  })

  it('shows 7px status dots with correct colors (green for enabled, gray for disabled)', async () => {
    renderRoute(router)

    const defaultGroup = await screen.findByText('Default group')
    const researchGroup = await screen.findByText('Research team')
    const archiveGroup = await screen.findByText('Archive')

    for (const el of [defaultGroup, researchGroup]) {
      const container = el.parentElement as HTMLElement
      const dot = container.querySelector('span.rounded-full') as HTMLElement
      expect(dot).toBeTruthy()
      expect(dot).toHaveClass('size-[7px]')
      expect(dot).toHaveClass('bg-green-600')
    }

    {
      const container = archiveGroup.parentElement as HTMLElement
      const dot = container.querySelector('span.rounded-full') as HTMLElement
      expect(dot).toBeTruthy()
      expect(dot).toHaveClass('size-[7px]')
      expect(dot).toHaveClass('bg-zinc-900/20')
    }
  })

  it('does not display textual Enabled/Disabled labels', async () => {
    renderRoute(router)

    await waitFor(() => {
      expect(screen.queryByText(/Enabled/i)).toBeNull()
      expect(screen.queryByText(/Disabled/i)).toBeNull()
    })
  })
})
