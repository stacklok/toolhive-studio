import { describe, it, expect, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server, recordRequests } from '@/common/mocks/node'
import { GroupRoute } from '../group.$groupName'
import { createTestRouter } from '@/common/test/create-test-router'
import { renderRoute } from '@/common/test/render-route'
import { waitFor } from '@testing-library/react'

// Mock CSS imports
vi.mock('katex/dist/katex.min.css', () => ({}))

// Mock the params to return 'default' as the group name
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    useParams: () => ({ groupName: 'default' }),
  }
})

describe('Groups Bug - Route should pass group parameter to API', () => {
  it.fails(
    'should call API with group=default but actually calls with group=null',
    async () => {
      const baseUrl = 'https://foo.bar.com'
      const requestRecorder = recordRequests()

      // Mock minimal API responses
      server.use(
        http.get(`${baseUrl}/api/v1beta/workloads`, () => {
          return HttpResponse.json({ workloads: [] })
        })
      )

      // Render the route
      function WrapperComponent() {
        return <GroupRoute />
      }

      const router = createTestRouter(WrapperComponent, '/group/default')
      renderRoute(router)

      // Wait for API call to be made
      await waitFor(() => {
        const workloadRequests = requestRecorder.recordedRequests.filter(
          (req) => req.pathname === '/api/v1beta/workloads'
        )
        expect(workloadRequests.length).toBeGreaterThan(0)
      })

      // Check what group parameter was actually sent
      const workloadRequests = requestRecorder.recordedRequests.filter(
        (req) => req.pathname === '/api/v1beta/workloads'
      )

      const groupParam = workloadRequests[0]?.search?.group

      // BUG: This should be 'default' but it's actually null/undefined
      // When the bug is fixed, change this to it() and update the expectation
      console.log('🐛 API called with group parameter:', groupParam)
      console.log('Expected: "default", Actual:', groupParam)

      expect(groupParam).toBe('default')
    }
  )
})
