import React from 'react'
import { render, waitFor, screen, act } from '@testing-library/react'
import { it, expect, vi, describe, beforeEach } from 'vitest'
import { DialogFormLocalMcp } from '../dialog-form-local-mcp'
import userEvent from '@testing-library/user-event'
import { Dialog } from '@/common/components/ui/dialog'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRunCustomServer } from '../../../hooks/use-run-custom-server'
import { useCheckServerStatus } from '@/common/hooks/use-check-server-status'
import { useUpdateServer } from '../../../hooks/use-update-server'
import {
  MCP_OPTIMIZER_GROUP_NAME,
  META_MCP_SERVER_NAME,
} from '@/common/lib/constants'
import { mockedGetApiV1BetaSecretsDefaultKeys } from '@mocks/fixtures/secrets_default_keys/get'
import { mockedGetApiV1BetaWorkloads } from '@mocks/fixtures/workloads/get'
import { mockedGetApiV1BetaGroups } from '@mocks/fixtures/groups/get'
import { mockedGetApiV1BetaWorkloadsByName } from '@mocks/fixtures/workloads_name/get'

// Mock the hook
vi.mock('../../../hooks/use-run-custom-server', () => ({
  useRunCustomServer: vi.fn(),
}))

vi.mock('@/common/hooks/use-check-server-status', () => ({
  useCheckServerStatus: vi.fn(),
}))

vi.mock('../../../hooks/use-update-server', () => ({
  useUpdateServer: vi.fn(),
}))

const mockUseCheckServerStatus = vi.mocked(useCheckServerStatus)

const mockUseRunCustomServer = vi.mocked(useRunCustomServer)

const mockUseUpdateServer = vi.mocked(useUpdateServer)

window.HTMLElement.prototype.hasPointerCapture = vi.fn()
window.HTMLElement.prototype.scrollIntoView = vi.fn()

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 0,
        staleTime: 0,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  )
}

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <Dialog open>{children}</Dialog>
)

beforeEach(() => {
  vi.clearAllMocks()

  // Setup mocks with default secrets
  mockedGetApiV1BetaSecretsDefaultKeys.override(() => ({
    keys: [
      { key: 'SECRET_FROM_STORE' },
      { key: 'GITHUB_TOKEN' },
      { key: 'API_KEY' },
    ],
  }))
  // Mock empty workloads by default
  mockedGetApiV1BetaWorkloads.activateScenario('empty')

  // Default mock implementation
  mockUseRunCustomServer.mockReturnValue({
    installServerMutation: vi.fn(),
    isErrorSecrets: false,
    isPendingSecrets: false,
  })

  mockUseCheckServerStatus.mockReturnValue({
    checkServerStatus: vi.fn(),
  })

  mockUseUpdateServer.mockReturnValue({
    updateServerMutation: vi.fn(),
    isPendingSecrets: false,
    isErrorSecrets: false,
  })
})

describe('DialogFormLocalMcp', () => {
  it('renders form fields correctly for docker image', async () => {
    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp isOpen closeDialog={vi.fn()} groupName="default" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Check dialog title and description
    expect(screen.getByText('Custom local MCP server')).toBeVisible()
    expect(
      screen.getByText(
        /ToolHive allows you to securely run a remote MCP server or a custom local MCP server from a Docker image or a package manager./
      )
    ).toBeVisible()

    // Check form fields
    expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Transport')).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: 'Docker image' })
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Command arguments')).toBeInTheDocument()

    // Check buttons
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Install server' })
    ).toBeInTheDocument()
  })

  it('opens with the latest groupName when group changes before opening', async () => {
    // Provide groups API
    mockedGetApiV1BetaGroups.override(() => ({
      groups: [{ name: 'default' }, { name: 'research' }],
    }))

    const mockInstallServerMutation = vi.fn()
    mockUseRunCustomServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    // Test harness to keep the dialog mounted while toggling props
    function Harness() {
      const [group, setGroup] = React.useState('default')
      const [open, setOpen] = React.useState(false)

      React.useEffect(() => {
        // Change group first while closed, then open
        const t = setTimeout(() => {
          setGroup('research')
          setOpen(true)
        }, 0)
        return () => clearTimeout(t)
      }, [])

      return (
        <Dialog open>
          <DialogFormLocalMcp
            key={`new-${group}`}
            isOpen={open}
            closeDialog={vi.fn()}
            groupName={group}
          />
        </Dialog>
      )
    }

    renderWithProviders(<Harness />)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    const groupCombobox = await screen.findByRole('combobox', { name: 'Group' })
    await userEvent.click(groupCombobox)
    const selected = await screen.findByRole('option', { name: 'research' })
    expect(selected).toHaveAttribute('aria-selected', 'true')
  })

  it('preselects the current route group in Group dropdown even with delayed groups', async () => {
    // Provide groups including a non-default one
    mockedGetApiV1BetaGroups.override(() => ({
      groups: [{ name: 'default' }, { name: 'research' }],
    }))

    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp isOpen closeDialog={vi.fn()} groupName="research" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Group select should show the route group preselected
    const groupCombobox = await screen.findByRole('combobox', { name: 'Group' })
    expect(groupCombobox).toHaveTextContent('research')
  })

  it('shows group field when editing an existing server', async () => {
    // Mock the existing server data
    mockedGetApiV1BetaWorkloadsByName.conditionalOverride(
      ({ path }) => path.name === 'test-server',
      (data) => ({
        ...data,
        name: 'test-server',
        image: 'ghcr.io/test/server',
        group: 'research',
      })
    )
    mockedGetApiV1BetaGroups.override(() => ({
      groups: [{ name: 'default' }, { name: 'research' }],
    }))

    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp
          isOpen
          closeDialog={vi.fn()}
          serverToEdit="test-server"
          groupName="research"
        />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    const groupCombobox = await screen.findByRole('combobox', { name: 'Group' })
    expect(groupCombobox).toBeVisible()
    expect(groupCombobox).toHaveTextContent('research')
  })

  it('hides group field when editing the meta-mcp server in the meta-mcp group', async () => {
    mockedGetApiV1BetaWorkloadsByName.conditionalOverride(
      ({ path }) => path.name === META_MCP_SERVER_NAME,
      (data) => ({
        ...data,
        name: META_MCP_SERVER_NAME,
        image: 'ghcr.io/toolhive/meta-mcp',
        group: MCP_OPTIMIZER_GROUP_NAME,
      })
    )
    mockedGetApiV1BetaGroups.override(() => ({
      groups: [
        { name: 'default' },
        { name: 'research' },
        { name: MCP_OPTIMIZER_GROUP_NAME },
      ],
    }))

    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp
          isOpen
          closeDialog={vi.fn()}
          serverToEdit={META_MCP_SERVER_NAME}
          groupName={MCP_OPTIMIZER_GROUP_NAME}
        />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /name/i })).toHaveValue(
        META_MCP_SERVER_NAME
      )
    })

    const groupCombobox = screen.queryByRole('combobox', { name: 'Group' })
    expect(groupCombobox).not.toBeInTheDocument()
  })

  it('shows group field when editing a different server in the meta-mcp group', async () => {
    mockedGetApiV1BetaWorkloadsByName.conditionalOverride(
      ({ path }) => path.name === 'other-server',
      (data) => ({
        ...data,
        name: 'other-server',
        image: 'ghcr.io/other/server',
        group: MCP_OPTIMIZER_GROUP_NAME,
      })
    )
    mockedGetApiV1BetaGroups.override(() => ({
      groups: [
        { name: 'default' },
        { name: 'research' },
        { name: MCP_OPTIMIZER_GROUP_NAME },
      ],
    }))

    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp
          isOpen
          closeDialog={vi.fn()}
          serverToEdit="other-server"
          groupName={MCP_OPTIMIZER_GROUP_NAME}
        />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /name/i })).toHaveValue(
        'other-server'
      )
    })

    const groupCombobox = await screen.findByRole('combobox', { name: 'Group' })
    expect(groupCombobox).toBeVisible()
    expect(groupCombobox).toBeInTheDocument()
  })

  it('submits the selected group in form data', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunCustomServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    mockedGetApiV1BetaGroups.override(() => ({
      groups: [{ name: 'default' }, { name: 'research' }],
    }))

    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp isOpen closeDialog={vi.fn()} groupName="research" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill minimal required fields
    await userEvent.type(
      screen.getByRole('textbox', { name: /name/i }),
      'test-server'
    )
    await userEvent.click(screen.getByLabelText('Transport'))
    await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Docker image' }),
      'ghcr.io/test/server'
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalled()
    })
    const firstArgs = mockInstallServerMutation.mock.calls[0]?.[0]
    expect(firstArgs?.data?.group).toBe('research')
  })

  it('submits docker image form with minimal required fields', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunCustomServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp isOpen closeDialog={vi.fn()} groupName="default" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill required fields
    await userEvent.type(
      screen.getByRole('textbox', { name: /name/i }),
      'test-server'
    )
    await userEvent.click(screen.getByLabelText('Transport'))
    await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Docker image' }),
      'ghcr.io/test/server'
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        {
          data: expect.objectContaining({
            name: 'test-server',
            transport: 'stdio',
            proxy_mode: 'streamable-http',
            image: 'ghcr.io/test/server',
            type: 'docker_image',
            envVars: [],
            secrets: [],
            cmd_arguments: [],
            networkIsolation: false,
            allowedHosts: [],
            allowedPorts: [],
            target_port: 0,
          }),
        },
        expect.any(Object)
      )
    })
  })

  it('submits package manager form with all fields', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunCustomServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp isOpen closeDialog={vi.fn()} groupName="default" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Switch to package manager radio button
    await userEvent.click(
      screen.getByRole('radio', { name: 'Package manager' })
    )

    // Fill all fields
    await userEvent.type(
      screen.getByRole('textbox', {
        name: /server name/i,
      }),
      'npm-server'
    )
    await userEvent.click(screen.getByLabelText('Transport'))
    await userEvent.click(screen.getByRole('option', { name: /sse/i }))
    await userEvent.type(screen.getByLabelText('Target port'), '8080')
    await userEvent.click(
      screen.getByRole('radio', {
        name: /package manager/i,
      })
    )
    await waitFor(() => {
      expect(
        screen.getByRole('radio', {
          name: /package manager/i,
        })
      ).toBeChecked()
    })
    // Open the package manager dropdown and select npx
    await userEvent.click(screen.getByRole('combobox', { name: /protocol/i }))
    await userEvent.click(screen.getByRole('option', { name: 'npx' }))
    await userEvent.type(screen.getByLabelText('Package name'), '@test/package')
    await userEvent.type(screen.getByLabelText('Command arguments'), '--debug')

    expect(screen.queryByLabelText(/proxy mode/i)).not.toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        {
          data: expect.objectContaining({
            name: 'npm-server',
            transport: 'sse',
            proxy_mode: 'streamable-http',
            target_port: 8080,
            protocol: 'npx',
            package_name: '@test/package',
            type: 'package_manager',
            cmd_arguments: ['--debug'],
          }),
        },
        expect.any(Object)
      )
    })
  })

  it('submits an inline secret correctly', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunCustomServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp isOpen closeDialog={vi.fn()} groupName="default" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await userEvent.type(
      screen.getByRole('textbox', { name: /name/i }),
      'inline-secret-server'
    )
    await userEvent.click(screen.getByLabelText('Transport'))
    await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Docker image' }),
      'ghcr.io/test/server'
    )

    await userEvent.click(screen.getByRole('button', { name: 'Add secret' }))
    await userEvent.type(screen.getByLabelText('Secret key'), 'API_TOKEN')
    await userEvent.type(screen.getByLabelText('Secret value'), 'secret-value')

    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        {
          data: expect.objectContaining({
            secrets: [
              {
                name: 'API_TOKEN',
                value: {
                  isFromStore: false,
                  secret: 'secret-value',
                },
              },
            ],
          }),
        },
        expect.any(Object)
      )
    })
  })

  it('submits a secret from the store correctly', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunCustomServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp isOpen closeDialog={vi.fn()} groupName="default" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await userEvent.type(
      screen.getByRole('textbox', { name: /name/i }),
      'store-secret-server'
    )
    await userEvent.click(screen.getByLabelText('Transport'))
    await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Docker image' }),
      'ghcr.io/test/server'
    )

    await userEvent.click(screen.getByRole('button', { name: 'Add secret' }))
    await userEvent.type(screen.getByLabelText('Secret key'), 'GITHUB_TOKEN')
    await userEvent.click(screen.getByLabelText('Use a secret from the store'))

    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: 'Secrets store' })
      ).toBeVisible()
    })

    await userEvent.click(
      screen.getByRole('option', { name: 'SECRET_FROM_STORE' })
    )

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Secrets store' })
      ).not.toBeInTheDocument()
    })

    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        {
          data: expect.objectContaining({
            secrets: [
              {
                name: 'GITHUB_TOKEN',
                value: {
                  isFromStore: true,
                  secret: 'SECRET_FROM_STORE',
                },
              },
            ],
          }),
        },
        expect.any(Object)
      )
    })
  })

  it('validates required fields and shows errors', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunCustomServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp isOpen closeDialog={vi.fn()} groupName="default" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Try to submit without filling required fields
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).not.toHaveBeenCalled()
    })

    // Check that validation errors are shown
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /name/i })).toHaveAttribute(
        'aria-invalid',
        'true'
      )
      expect(
        screen.getByRole('textbox', { name: 'Docker image' })
      ).toHaveAttribute('aria-invalid', 'true')
    })
  })

  it('shows loading state when submitting', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunCustomServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp isOpen closeDialog={vi.fn()} groupName="default" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill required fields
    await userEvent.type(
      screen.getByRole('textbox', { name: /name/i }),
      'test-server'
    )
    await userEvent.click(screen.getByLabelText('Transport'))
    await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Docker image' }),
      'ghcr.io/test/server'
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    // The loading state should be shown
    await waitFor(() => {
      expect(
        screen.getByText(/installing server|creating secrets/i)
      ).toBeInTheDocument()
    })
  })

  it('renders aria-hidden column labels for storage volumes', async () => {
    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp isOpen closeDialog={vi.fn()} groupName="default" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    expect(screen.getByText('Storage volumes')).toBeInTheDocument()

    const hostLabel = screen.getByText('Host path')
    const containerLabel = screen.getByText('Container path')

    expect(hostLabel).toBeVisible()
    expect(containerLabel).toBeVisible()
    expect(hostLabel).toHaveAttribute('aria-hidden', 'true')
    expect(containerLabel).toHaveAttribute('aria-hidden', 'true')
  })

  it('closes dialog on successful submission', async () => {
    const mockInstallServerMutation = vi.fn()
    const mockCheckServerStatus = vi.fn()
    const mockOnOpenChange = vi.fn()

    mockUseCheckServerStatus.mockReturnValue({
      checkServerStatus: mockCheckServerStatus,
    })

    mockUseRunCustomServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp
          isOpen
          closeDialog={mockOnOpenChange}
          groupName="default"
        />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill required fields
    await userEvent.type(
      screen.getByRole('textbox', { name: /name/i }),
      'test-server'
    )
    await userEvent.click(screen.getByLabelText('Transport'))
    await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Docker image' }),
      'ghcr.io/test/server'
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalled()
    })

    // Simulate successful submission
    const onSuccessCallback =
      mockInstallServerMutation.mock.calls[0]?.[1]?.onSuccess

    await act(async () => {
      onSuccessCallback?.()
    })

    await waitFor(() => {
      expect(mockCheckServerStatus).toHaveBeenCalled()
      expect(mockOnOpenChange).toHaveBeenCalled()
    })
  })

  it('can cancel and close dialog', async () => {
    const mockOnOpenChange = vi.fn()

    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp
          isOpen
          closeDialog={mockOnOpenChange}
          groupName="default"
        />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mockOnOpenChange).toHaveBeenCalled()
  })

  describe('Network Isolation', () => {
    it('submits correct payload with network isolation enabled', async () => {
      const mockInstallServerMutation = vi.fn()
      mockUseRunCustomServer.mockReturnValue({
        installServerMutation: mockInstallServerMutation,
        isErrorSecrets: false,
        isPendingSecrets: false,
      })

      renderWithProviders(
        <Wrapper>
          <DialogFormLocalMcp
            isOpen
            closeDialog={vi.fn()}
            groupName="default"
          />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeVisible()
      })

      await userEvent.type(
        screen.getByRole('textbox', { name: /name/i }),
        'test-server'
      )
      await userEvent.click(screen.getByLabelText('Transport'))
      await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
      await userEvent.type(
        screen.getByRole('textbox', { name: 'Docker image' }),
        'ghcr.io/test/server'
      )

      const networkTab = screen.getByRole('tab', { name: /network isolation/i })
      await userEvent.click(networkTab)

      const switchLabel = screen.getByLabelText(
        'Enable outbound network filtering'
      )
      await userEvent.click(switchLabel)

      const addHostBtn = screen.getByRole('button', { name: /add a host/i })
      await userEvent.click(addHostBtn)
      const hostInput = screen.getByLabelText('Host 1')
      await userEvent.type(hostInput, 'example.com')

      const addPortBtn = screen.getByRole('button', { name: /add a port/i })
      await userEvent.click(addPortBtn)
      const portInput = screen.getByLabelText('Port 1')
      await userEvent.type(portInput, '8080')

      await userEvent.click(
        screen.getByRole('button', { name: 'Install server' })
      )

      await waitFor(() => {
        expect(mockInstallServerMutation).toHaveBeenCalled()
      })

      const submittedData = mockInstallServerMutation.mock.calls[0]?.[0]?.data
      expect(submittedData).toMatchObject({
        name: 'test-server',
        type: 'docker_image',
        transport: 'stdio',
        image: 'ghcr.io/test/server',
        networkIsolation: true,
        allowedHosts: [{ value: 'example.com' }],
        allowedPorts: [{ value: '8080' }],
      })
    })

    it('submits correct payload with network isolation disabled', async () => {
      const mockInstallServerMutation = vi.fn()
      mockUseRunCustomServer.mockReturnValue({
        installServerMutation: mockInstallServerMutation,
        isErrorSecrets: false,
        isPendingSecrets: false,
      })

      renderWithProviders(
        <Wrapper>
          <DialogFormLocalMcp
            isOpen
            closeDialog={vi.fn()}
            groupName="default"
          />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeVisible()
      })

      await userEvent.type(
        screen.getByRole('textbox', { name: /name/i }),
        'test-server'
      )
      await userEvent.click(screen.getByLabelText('Transport'))
      await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
      await userEvent.type(
        screen.getByRole('textbox', { name: 'Docker image' }),
        'ghcr.io/test/server'
      )

      await userEvent.click(
        screen.getByRole('button', { name: 'Install server' })
      )

      await waitFor(() => {
        expect(mockInstallServerMutation).toHaveBeenCalled()
      })

      const submittedData = mockInstallServerMutation.mock.calls[0]?.[0]?.data
      expect(submittedData).toMatchObject({
        name: 'test-server',
        type: 'docker_image',
        transport: 'stdio',
        image: 'ghcr.io/test/server',
        networkIsolation: false,
      })
    })

    it('resets tab to configuration when canceling', async () => {
      const mockOnOpenChange = vi.fn()

      renderWithProviders(
        <Wrapper>
          <DialogFormLocalMcp
            isOpen
            closeDialog={mockOnOpenChange}
            groupName="default"
          />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeVisible()
      })

      const networkTab = screen.getByRole('tab', { name: /network isolation/i })
      await userEvent.click(networkTab)
      expect(networkTab).toHaveAttribute('aria-selected', 'true')

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(mockOnOpenChange).toHaveBeenCalled()

      renderWithProviders(
        <Wrapper>
          <DialogFormLocalMcp
            isOpen
            closeDialog={mockOnOpenChange}
            groupName="default"
          />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeVisible()
      })

      const configTab = screen.getByRole('tab', { name: /configuration/i })
      expect(configTab).toHaveAttribute('aria-selected', 'true')
    })

    it('activates the network isolation tab if a validation error occurs there while on the configuration tab', async () => {
      renderWithProviders(
        <Wrapper>
          <DialogFormLocalMcp
            isOpen
            closeDialog={vi.fn()}
            groupName="default"
          />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeVisible()
      })

      const configTab = screen.getByRole('tab', { name: /configuration/i })
      expect(configTab).toHaveAttribute('aria-selected', 'true')

      await userEvent.type(
        screen.getByRole('textbox', { name: /name/i }),
        'test-server'
      )
      await userEvent.click(screen.getByLabelText('Transport'))
      await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
      await userEvent.type(
        screen.getByRole('textbox', { name: 'Docker image' }),
        'ghcr.io/test/server'
      )

      const networkTab = screen.getByRole('tab', { name: /network isolation/i })
      await userEvent.click(networkTab)
      const switchLabel = screen.getByLabelText(
        'Enable outbound network filtering'
      )
      await userEvent.click(switchLabel)

      const addHostBtn = screen.getByRole('button', { name: /add a host/i })
      await userEvent.click(addHostBtn)
      const hostInput = screen.getByLabelText('Host 1')
      await userEvent.type(hostInput, 'not a host')
      await userEvent.tab()

      await userEvent.click(configTab)
      expect(configTab).toHaveAttribute('aria-selected', 'true')

      await userEvent.click(
        screen.getByRole('button', { name: 'Install server' })
      )

      await waitFor(() => {
        expect(networkTab).toHaveAttribute('aria-selected', 'true')
      })
    })

    it('activates the configuration tab if a validation error occurs there while on the network isolation tab', async () => {
      renderWithProviders(
        <Wrapper>
          <DialogFormLocalMcp
            isOpen
            closeDialog={vi.fn()}
            groupName="default"
          />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeVisible()
      })

      const networkTab = screen.getByRole('tab', { name: /network isolation/i })
      await userEvent.click(networkTab)
      expect(networkTab).toHaveAttribute('aria-selected', 'true')

      await userEvent.click(
        screen.getByRole('button', { name: 'Install server' })
      )

      const configTab = screen.getByRole('tab', { name: /configuration/i })
      expect(configTab).toHaveAttribute('aria-selected', 'true')
    })

    it('shows alert when network isolation is enabled but no hosts or ports are configured', async () => {
      renderWithProviders(
        <Wrapper>
          <DialogFormLocalMcp
            isOpen
            closeDialog={vi.fn()}
            groupName="default"
          />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeVisible()
      })

      const networkTab = screen.getByRole('tab', { name: /network isolation/i })
      await userEvent.click(networkTab)

      const switchLabel = screen.getByLabelText(
        'Enable outbound network filtering'
      )
      await userEvent.click(switchLabel)

      await waitFor(() => {
        expect(
          screen.getByText(
            'This configuration blocks all outbound network traffic from the MCP server.'
          )
        ).toBeInTheDocument()
      })

      const addHostBtn = screen.getByRole('button', { name: /add a host/i })
      await userEvent.click(addHostBtn)
      const hostInput = screen.getByLabelText('Host 1')
      await userEvent.type(hostInput, 'example.com')

      await waitFor(() => {
        expect(
          screen.queryByText(
            'This configuration blocks all outbound network traffic from the MCP server.'
          )
        ).not.toBeInTheDocument()
      })
    })

    it('skip allowedHosts and allowedPorts validation when network isolation is disabled', async () => {
      const mockInstallServerMutation = vi.fn()
      mockUseRunCustomServer.mockReturnValue({
        installServerMutation: mockInstallServerMutation,
        isErrorSecrets: false,
        isPendingSecrets: false,
      })

      renderWithProviders(
        <Wrapper>
          <DialogFormLocalMcp
            isOpen
            closeDialog={vi.fn()}
            groupName="default"
          />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeVisible()
      })

      await userEvent.type(
        screen.getByRole('textbox', { name: /name/i }),
        'test-server'
      )
      await userEvent.click(screen.getByLabelText('Transport'))
      await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
      await userEvent.type(
        screen.getByRole('textbox', { name: 'Docker image' }),
        'ghcr.io/test/server'
      )

      const networkTab = screen.getByRole('tab', { name: /network isolation/i })
      await userEvent.click(networkTab)

      // Enable network isolation first
      const switchLabel = screen.getByLabelText(
        'Enable outbound network filtering'
      )
      await userEvent.click(switchLabel)

      const addHostBtn = screen.getByRole('button', { name: /add a host/i })
      await userEvent.click(addHostBtn)
      const hostInput = screen.getByLabelText('Host 1')
      await userEvent.type(hostInput, '232342') // Invalid host format

      const addPortBtn = screen.getByRole('button', { name: /add a port/i })
      await userEvent.click(addPortBtn)
      const portInput = screen.getByLabelText('Port 1')
      await userEvent.type(portInput, '99999') // Invalid port (out of range)

      await waitFor(() => {
        expect(screen.getByText('Invalid host format')).toBeInTheDocument()
        expect(
          screen.getByText('Port must be a number between 1 and 65535')
        ).toBeInTheDocument()
      })

      // Disable network isolation
      await userEvent.click(switchLabel)

      await waitFor(() => {
        expect(
          screen.queryByText('Invalid host format')
        ).not.toBeInTheDocument()
        expect(
          screen.queryByText('Port must be a number between 1 and 65535')
        ).not.toBeInTheDocument()
      })

      const configTab = screen.getByRole('tab', { name: /configuration/i })
      await userEvent.click(configTab)

      await userEvent.click(
        screen.getByRole('button', { name: 'Install server' })
      )

      await waitFor(() => {
        expect(mockInstallServerMutation).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              name: 'test-server',
              type: 'docker_image',
              image: 'ghcr.io/test/server',
              transport: 'stdio',
              networkIsolation: false,
              allowedHosts: [{ value: '232342' }],
              allowedPorts: [{ value: '99999' }],
            }),
          }),
          expect.any(Object)
        )
      })
    })
  })

  describe('envVarsOverride', () => {
    it('pre-fills missing env vars when editing with envVarsOverride', async () => {
      mockedGetApiV1BetaWorkloadsByName.conditionalOverride(
        ({ path }) => path.name === 'test-server',
        (data) => ({
          ...data,
          name: 'test-server',
          image: 'ghcr.io/test/server:v1',
          transport: 'stdio',
          group: 'default',
          env_vars: { EXISTING_VAR: 'existing-value' },
        })
      )

      renderWithProviders(
        <Wrapper>
          <DialogFormLocalMcp
            isOpen
            closeDialog={vi.fn()}
            serverToEdit="test-server"
            groupName="default"
            imageOverride="ghcr.io/test/server:v2"
            envVarsOverride={[
              { name: 'NEW_API_URL', value: '' },
              { name: 'NEW_LOG_LEVEL', value: '' },
            ]}
          />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeVisible()
      })

      // Wait for the form to populate with data
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /name/i })).toHaveValue(
          'test-server'
        )
      })

      // Image should be overridden
      expect(screen.getByRole('textbox', { name: 'Docker image' })).toHaveValue(
        'ghcr.io/test/server:v2'
      )

      // Existing env var should be present
      expect(screen.getByDisplayValue('EXISTING_VAR')).toBeVisible()
      expect(screen.getByDisplayValue('existing-value')).toBeVisible()

      // New env vars from override should be pre-filled with empty values
      expect(screen.getByDisplayValue('NEW_API_URL')).toBeVisible()
      expect(screen.getByDisplayValue('NEW_LOG_LEVEL')).toBeVisible()
    })

    it('does not add extra env vars when envVarsOverride is null', async () => {
      mockedGetApiV1BetaWorkloadsByName.conditionalOverride(
        ({ path }) => path.name === 'test-server',
        (data) => ({
          ...data,
          name: 'test-server',
          image: 'ghcr.io/test/server:v1',
          transport: 'stdio',
          group: 'default',
          env_vars: { EXISTING_VAR: 'existing-value' },
        })
      )

      renderWithProviders(
        <Wrapper>
          <DialogFormLocalMcp
            isOpen
            closeDialog={vi.fn()}
            serverToEdit="test-server"
            groupName="default"
          />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeVisible()
      })

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /name/i })).toHaveValue(
          'test-server'
        )
      })

      // Existing env var should be present
      expect(screen.getByDisplayValue('EXISTING_VAR')).toBeVisible()
      expect(screen.getByDisplayValue('existing-value')).toBeVisible()

      // No extra env var rows should exist
      expect(screen.queryByDisplayValue('NEW_API_URL')).not.toBeInTheDocument()
    })

    it('pre-fills missing secrets when editing with secretsOverride', async () => {
      mockedGetApiV1BetaWorkloadsByName.conditionalOverride(
        ({ path }) => path.name === 'test-server',
        (data) => ({
          ...data,
          name: 'test-server',
          image: 'ghcr.io/test/server:v1',
          transport: 'stdio',
          group: 'default',
          secrets: [{ name: 'existing-key', target: 'EXISTING_SECRET' }],
        })
      )

      renderWithProviders(
        <Wrapper>
          <DialogFormLocalMcp
            isOpen
            closeDialog={vi.fn()}
            serverToEdit="test-server"
            groupName="default"
            imageOverride="ghcr.io/test/server:v2"
            secretsOverride={[
              {
                name: 'NEW_API_KEY',
                value: { secret: '', isFromStore: false },
              },
            ]}
          />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeVisible()
      })

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /name/i })).toHaveValue(
          'test-server'
        )
      })

      // Existing secret should be present
      expect(screen.getByDisplayValue('EXISTING_SECRET')).toBeVisible()

      // New secret from override should be pre-filled
      expect(screen.getByDisplayValue('NEW_API_KEY')).toBeVisible()
    })
  })

  it('paste arg from clipboard into command arguments field', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunCustomServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp isOpen closeDialog={vi.fn()} groupName="default" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await userEvent.type(
      screen.getByRole('textbox', { name: /name/i }),
      'npm-server'
    )
    await userEvent.click(screen.getByLabelText('Transport'))
    await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Docker image' }),
      'ghcr.io/test/server'
    )

    const commandArgsInput = screen.getByLabelText('Command arguments')
    await userEvent.click(commandArgsInput)

    await userEvent.paste('--toolsets repos,issues,pull_requests --read-only')

    expect(screen.getByText('--toolsets')).toBeVisible()
    expect(screen.getByText('repos,issues,pull_requests')).toBeVisible()
    expect(screen.getByText('--read-only')).toBeVisible()

    expect(commandArgsInput).toHaveValue('')
    expect(screen.getByText('repos,issues,pull_requests')).toBeVisible()
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cmd_arguments: [
              '--toolsets',
              'repos,issues,pull_requests',
              '--read-only',
            ],
          }),
        }),
        expect.any(Object)
      )
    })
  })
})
