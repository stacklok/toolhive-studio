import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ManageClientsButton } from '../manage-clients-button'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/msw-endpoint'

// Mock the prompt context
const mockPromptForm = vi.fn()
vi.mock('@/common/hooks/use-prompt', () => ({
  usePrompt: () => mockPromptForm,
}))

// Mock console.log to capture form results
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

describe('ManageClientsButton - Data Fetching and Group Awareness', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
    mockConsoleLog.mockClear()
  })

  const renderWithProviders = (props: { groupName: string }) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ManageClientsButton {...props} />
      </QueryClientProvider>
    )
  }

  describe('Group-specific client status fetching', () => {
    it('should fetch and display current client status for the specified group', async () => {
      // Mock groups data where 'default' group has 'vscode' and 'cursor' registered
      server.use(
        http.get(mswEndpoint('/api/v1beta/groups'), () => {
          return HttpResponse.json({
            groups: [
              { name: 'default', registered_clients: ['vscode', 'cursor'] },
              { name: 'research', registered_clients: ['claude-code'] },
            ],
          })
        })
      )

      const user = userEvent.setup()
      renderWithProviders({ groupName: 'default' })

      const button = screen.getByRole('button', { name: /manage clients/i })
      await user.click(button)

      // The form should be called with the current state of clients for the 'default' group
      expect(mockPromptForm).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultValues: {
            enableVSCode: true, // Should be true because 'vscode' is in 'default' group
            enableCursor: true, // Should be true because 'cursor' is in 'default' group
            enableClaudeCode: false, // Should be false because 'claude-code' is not in 'default' group
          },
        })
      )
    })

    it('should fetch and display different client status for different groups', async () => {
      // Mock groups data where 'research' group has only 'claude-code' registered
      server.use(
        http.get(mswEndpoint('/api/v1beta/groups'), () => {
          return HttpResponse.json({
            groups: [
              { name: 'default', registered_clients: ['vscode', 'cursor'] },
              { name: 'research', registered_clients: ['claude-code'] },
            ],
          })
        })
      )

      const user = userEvent.setup()
      renderWithProviders({ groupName: 'research' })

      const button = screen.getByRole('button', { name: /manage clients/i })
      await user.click(button)

      // The form should be called with the current state of clients for the 'research' group
      expect(mockPromptForm).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultValues: {
            enableVSCode: false, // Should be false because 'vscode' is not in 'research' group
            enableCursor: false, // Should be false because 'cursor' is not in 'research' group
            enableClaudeCode: true, // Should be true because 'claude-code' is in 'research' group
          },
        })
      )
    })

    it('should handle empty group (no clients registered)', async () => {
      // Mock groups data where 'empty-group' has no clients registered
      server.use(
        http.get(mswEndpoint('/api/v1beta/groups'), () => {
          return HttpResponse.json({
            groups: [
              { name: 'default', registered_clients: ['vscode'] },
              { name: 'empty-group', registered_clients: [] },
            ],
          })
        })
      )

      const user = userEvent.setup()
      renderWithProviders({ groupName: 'empty-group' })

      const button = screen.getByRole('button', { name: /manage clients/i })
      await user.click(button)

      // All toggles should be false for an empty group
      expect(mockPromptForm).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultValues: {
            enableVSCode: false,
            enableCursor: false,
            enableClaudeCode: false,
          },
        })
      )
    })

    it('should handle non-existent group gracefully', async () => {
      // Mock groups data that doesn't include the requested group
      server.use(
        http.get(mswEndpoint('/api/v1beta/groups'), () => {
          return HttpResponse.json({
            groups: [
              { name: 'default', registered_clients: ['vscode'] },
              { name: 'research', registered_clients: ['cursor'] },
            ],
          })
        })
      )

      const user = userEvent.setup()
      renderWithProviders({ groupName: 'non-existent-group' })

      const button = screen.getByRole('button', { name: /manage clients/i })
      await user.click(button)

      // All toggles should be false for a non-existent group
      expect(mockPromptForm).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultValues: {
            enableVSCode: false,
            enableCursor: false,
            enableClaudeCode: false,
          },
        })
      )
    })
  })

  describe('Form submission with group-aware API calls', () => {
    it('should make correct API calls when enabling clients for a group', async () => {
      // Mock initial state: no clients in the group
      server.use(
        http.get(mswEndpoint('/api/v1beta/groups'), () => {
          return HttpResponse.json({
            groups: [{ name: 'default', registered_clients: [] }],
          })
        }),
        // Mock the GET /api/v1beta/clients endpoint to return empty client data
        http.get(mswEndpoint('/api/v1beta/clients'), () => {
          return HttpResponse.json([])
        })
      )

      // Capture API calls to verify the request body
      const capturedRequests: Array<{ name: string; groups: string[] }> = []
      server.use(
        http.post(mswEndpoint('/api/v1beta/clients'), async ({ request }) => {
          const body = (await request.json()) as {
            name: string
            groups: string[]
          }
          capturedRequests.push(body)
          return HttpResponse.json(
            { name: body.name, groups: body.groups },
            { status: 200 }
          )
        })
      )

      // Mock form submission with VS Code and Cursor enabled
      const mockResult = {
        enableVSCode: true,
        enableCursor: true,
        enableClaudeCode: false,
      }
      mockPromptForm.mockResolvedValue(mockResult)

      const user = userEvent.setup()
      renderWithProviders({ groupName: 'default' })

      const button = screen.getByRole('button', { name: /manage clients/i })
      await user.click(button)

      await waitFor(() => {
        expect(mockConsoleLog).toHaveBeenCalledWith(
          'Manage clients form submitted with values:',
          mockResult
        )
      })

      // Should make API calls for each enabled client
      await waitFor(() => {
        expect(capturedRequests).toHaveLength(2)
      })

      // Verify the API calls are made with correct parameters
      expect(capturedRequests).toEqual([
        { name: 'vscode', groups: ['default'] },
        { name: 'cursor', groups: ['default'] },
      ])
    })

    it('should make correct API calls when disabling clients from a group', async () => {
      // Mock initial state: all clients are in the group
      server.use(
        http.get(mswEndpoint('/api/v1beta/groups'), () => {
          return HttpResponse.json({
            groups: [
              {
                name: 'default',
                registered_clients: ['vscode', 'cursor', 'claude-code'],
              },
            ],
          })
        })
      )

      // Capture DELETE requests to verify the correct group is targeted
      const capturedDeletes: Array<{
        method: string
        clientName: string
        groupName: string
        url: string
      }> = []
      server.use(
        http.delete(
          mswEndpoint('/api/v1beta/clients/:name/groups/:group'),
          async ({ request, params }) => {
            capturedDeletes.push({
              method: 'DELETE',
              clientName: params.name as string,
              groupName: params.group as string,
              url: request.url,
            })
            return new HttpResponse(null, { status: 204 })
          }
        )
      )

      // Mock form submission with only VS Code enabled (disabling Cursor and Claude Code)
      const mockResult = {
        enableVSCode: true,
        enableCursor: false,
        enableClaudeCode: false,
      }
      mockPromptForm.mockResolvedValue(mockResult)

      const user = userEvent.setup()
      renderWithProviders({ groupName: 'default' })

      const button = screen.getByRole('button', { name: /manage clients/i })
      await user.click(button)

      await waitFor(() => {
        expect(mockConsoleLog).toHaveBeenCalledWith(
          'Manage clients form submitted with values:',
          mockResult
        )
      })

      // Should make DELETE API calls for each disabled client
      await waitFor(() => {
        expect(capturedDeletes).toHaveLength(2)
      })

      // Verify the DELETE API calls target the correct group
      expect(capturedDeletes).toEqual([
        {
          method: 'DELETE',
          clientName: 'cursor',
          groupName: 'default',
          url: expect.stringContaining(
            '/api/v1beta/clients/cursor/groups/default'
          ),
        },
        {
          method: 'DELETE',
          clientName: 'claude-code',
          groupName: 'default',
          url: expect.stringContaining(
            '/api/v1beta/clients/claude-code/groups/default'
          ),
        },
      ])
    })

    it('should handle mixed enable/disable operations correctly', async () => {
      // Mock initial state: VS Code and Cursor are in the group, Claude Code is not
      server.use(
        http.get(mswEndpoint('/api/v1beta/groups'), () => {
          return HttpResponse.json({
            groups: [
              { name: 'default', registered_clients: ['vscode', 'cursor'] },
            ],
          })
        }),
        // Mock the GET /api/v1beta/clients endpoint to return existing client data
        http.get(mswEndpoint('/api/v1beta/clients'), () => {
          return HttpResponse.json([
            {
              name: { name: 'vscode' },
              groups: ['default'],
            },
            {
              name: { name: 'cursor' },
              groups: ['default'],
            },
          ])
        })
      )

      // Capture API calls
      const capturedPosts: Array<{ name: string; groups: string[] }> = []
      const capturedDeletes: Array<{
        method: string
        clientName: string
        groupName: string
        url: string
      }> = []

      server.use(
        http.post(mswEndpoint('/api/v1beta/clients'), async ({ request }) => {
          const body = (await request.json()) as {
            name: string
            groups: string[]
          }
          capturedPosts.push(body)
          return HttpResponse.json(
            { name: body.name, groups: body.groups },
            { status: 200 }
          )
        }),
        http.delete(
          mswEndpoint('/api/v1beta/clients/:name/groups/:group'),
          async ({ request, params }) => {
            capturedDeletes.push({
              method: 'DELETE',
              clientName: params.name as string,
              groupName: params.group as string,
              url: request.url,
            })
            return new HttpResponse(null, { status: 204 })
          }
        )
      )

      // Mock form submission: disable VS Code, keep Cursor, enable Claude Code
      const mockResult = {
        enableVSCode: false,
        enableCursor: true,
        enableClaudeCode: true,
      }
      mockPromptForm.mockResolvedValue(mockResult)

      const user = userEvent.setup()
      renderWithProviders({ groupName: 'default' })

      const button = screen.getByRole('button', { name: /manage clients/i })
      await user.click(button)

      await waitFor(() => {
        expect(mockConsoleLog).toHaveBeenCalledWith(
          'Manage clients form submitted with values:',
          mockResult
        )
      })

      // Should make one DELETE call (for VS Code) and one POST call (for Claude Code)
      await waitFor(() => {
        expect(capturedDeletes).toHaveLength(1)
        expect(capturedPosts).toHaveLength(1)
      })

      // Verify the operations
      expect(capturedDeletes).toEqual([
        {
          method: 'DELETE',
          clientName: 'vscode',
          groupName: 'default',
          url: expect.stringContaining(
            '/api/v1beta/clients/vscode/groups/default'
          ),
        },
      ])

      expect(capturedPosts).toEqual([
        { name: 'claude-code', groups: ['default'] },
      ])
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle API errors gracefully when fetching groups data', async () => {
      // Mock console.error to prevent test failure
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      // Mock API error
      server.use(
        http.get(mswEndpoint('/api/v1beta/groups'), () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          )
        })
      )

      const user = userEvent.setup()
      renderWithProviders({ groupName: 'default' })

      const button = screen.getByRole('button', { name: /manage clients/i })
      await user.click(button)

      // Should still open the form with default values (all false) when API fails
      expect(mockPromptForm).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultValues: {
            enableVSCode: false,
            enableCursor: false,
            enableClaudeCode: false,
          },
        })
      )

      // Clean up
      consoleErrorSpy.mockRestore()
    })

    it('should handle API errors gracefully when submitting form', async () => {
      // Mock console.error to prevent test failure
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      // Mock successful groups fetch but failed client operations
      server.use(
        http.get(mswEndpoint('/api/v1beta/groups'), () => {
          return HttpResponse.json({
            groups: [{ name: 'default', registered_clients: [] }],
          })
        }),
        http.post(mswEndpoint('/api/v1beta/clients'), () => {
          return HttpResponse.json(
            { error: 'Failed to register client' },
            { status: 500 }
          )
        })
      )

      const mockResult = {
        enableVSCode: true,
        enableCursor: false,
        enableClaudeCode: false,
      }
      mockPromptForm.mockResolvedValue(mockResult)

      const user = userEvent.setup()
      renderWithProviders({ groupName: 'default' })

      // Use getAllByRole to handle multiple buttons and take the first one
      const buttons = screen.getAllByRole('button', { name: /manage clients/i })
      const button = buttons[0]
      await user.click(button)

      // Should still log the form result even if API calls fail
      await waitFor(() => {
        expect(mockConsoleLog).toHaveBeenCalledWith(
          'Manage clients form submitted with values:',
          mockResult
        )
      })

      // Clean up
      consoleErrorSpy.mockRestore()
    })

    it('should handle form cancellation without making API calls', async () => {
      // Mock groups data
      server.use(
        http.get(mswEndpoint('/api/v1beta/groups'), () => {
          return HttpResponse.json({
            groups: [{ name: 'default', registered_clients: ['vscode'] }],
          })
        })
      )

      // Capture API calls to ensure none are made
      const capturedRequests: Array<{ name: string; groups: string[] }> = []
      server.use(
        http.post(mswEndpoint('/api/v1beta/clients'), async ({ request }) => {
          const body = (await request.json()) as {
            name: string
            groups: string[]
          }
          capturedRequests.push(body)
          return HttpResponse.json(
            { name: body.name, groups: body.groups },
            { status: 200 }
          )
        })
      )

      // Mock form cancellation
      mockPromptForm.mockResolvedValue(null)

      const user = userEvent.setup()
      renderWithProviders({ groupName: 'default' })

      const button = screen.getByRole('button', { name: /manage clients/i })
      await user.click(button)

      // Should only log the original values, not form submission
      await waitFor(() => {
        expect(mockConsoleLog).toHaveBeenCalledWith('Original client status for group:', 'default', expect.any(Object))
        expect(mockConsoleLog).not.toHaveBeenCalledWith('Manage clients form submitted with values:', expect.any(Object))
      })

      // Should not make any API calls when form is cancelled
      await waitFor(() => {
        expect(capturedRequests).toHaveLength(0)
      })
    })
  })

  describe('Parametric tests for different group scenarios', () => {
    const testCases = [
      {
        groupName: 'default',
        registeredClients: ['vscode', 'cursor'],
        expectedDefaults: {
          enableVSCode: true,
          enableCursor: true,
          enableClaudeCode: false,
        },
      },
      {
        groupName: 'research',
        registeredClients: ['claude-code'],
        expectedDefaults: {
          enableVSCode: false,
          enableCursor: false,
          enableClaudeCode: true,
        },
      },
      {
        groupName: 'development',
        registeredClients: ['vscode', 'cursor', 'claude-code'],
        expectedDefaults: {
          enableVSCode: true,
          enableCursor: true,
          enableClaudeCode: true,
        },
      },
      {
        groupName: 'production',
        registeredClients: [],
        expectedDefaults: {
          enableVSCode: false,
          enableCursor: false,
          enableClaudeCode: false,
        },
      },
    ]

    testCases.forEach(({ groupName, registeredClients, expectedDefaults }) => {
      it(`should fetch correct client status for group: ${groupName}`, async () => {
        // Mock groups data for the specific test case
        server.use(
          http.get(mswEndpoint('/api/v1beta/groups'), () => {
            return HttpResponse.json({
              groups: [
                { name: groupName, registered_clients: registeredClients },
              ],
            })
          })
        )

        const user = userEvent.setup()
        renderWithProviders({ groupName })

        const button = screen.getByRole('button', { name: /manage clients/i })
        await user.click(button)

        // Verify the form is called with the correct default values
        expect(mockPromptForm).toHaveBeenCalledWith(
          expect.objectContaining({
            defaultValues: expectedDefaults,
          })
        )
      })
    })
  })
})
