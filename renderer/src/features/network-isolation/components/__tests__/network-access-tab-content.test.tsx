import { screen, waitFor } from '@testing-library/react'
import { expect, it, describe } from 'vitest'
import { useForm } from 'react-hook-form'
import userEvent from '@testing-library/user-event'
import { NetworkAccessTabContent } from '../network-access-tab-content'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import { Form } from '@/common/components/ui/form'
import type { FormSchemaLocalMcp } from '@/features/mcp-servers/lib/form-schema-local-mcp'

function TestWrapper({
  initialValues = {},
}: {
  initialValues?: Partial<FormSchemaLocalMcp>
}) {
  const form = useForm<FormSchemaLocalMcp>({
    defaultValues: {
      name: '',
      transport: 'stdio',
      type: 'docker_image',
      image: '',
      envVars: [],
      secrets: [],
      cmd_arguments: [],
      networkAccess: 'none',
      allowedDestinations: 'anywhere',
      allowHostAccess: false,
      allowedHosts: [],
      allowedPorts: [],
      ...initialValues,
    },
  })

  return (
    <Form {...form}>
      <NetworkAccessTabContent form={form} />
    </Form>
  )
}

const router = createTestRouter(() => <TestWrapper />)

describe('NetworkAccessTabContent', () => {
  describe('Network access radio group', () => {
    it('renders all three network access options', async () => {
      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByLabelText('No isolation')).toBeInTheDocument()
      })
      expect(
        screen.getByLabelText('Host networking (Advanced)')
      ).toBeInTheDocument()
      expect(
        screen.getByLabelText('Isolate behind an HTTP proxy')
      ).toBeInTheDocument()
    })

    it('defaults to no isolation being selected', async () => {
      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByLabelText('No isolation')).toBeChecked()
      })
      expect(
        screen.getByLabelText('Isolate behind an HTTP proxy')
      ).not.toBeChecked()
    })

    it('selects isolate behind an HTTP proxy when clicked', async () => {
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByLabelText('Isolate behind an HTTP proxy')
        ).toBeInTheDocument()
      })

      await userEvent.click(
        screen.getByLabelText('Isolate behind an HTTP proxy')
      )

      await waitFor(() => {
        expect(
          screen.getByLabelText('Isolate behind an HTTP proxy')
        ).toBeChecked()
      })
    })

    it('shows a host networking warning when host networking is selected', async () => {
      renderRoute(router)

      await userEvent.click(screen.getByLabelText('Host networking (Advanced)'))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
      expect(
        screen.getByText(/shares the host machine.s network namespace/i)
      ).toBeInTheDocument()
    })
  })

  describe('Allowed destinations', () => {
    it('does not show allowed destinations when no isolation is selected', async () => {
      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByLabelText('No isolation')).toBeInTheDocument()
      })

      expect(screen.queryByText('Allowed destinations')).not.toBeInTheDocument()
    })

    it('shows allowed destinations once the proxy mode is selected', async () => {
      renderRoute(router)

      await userEvent.click(
        screen.getByLabelText('Isolate behind an HTTP proxy')
      )

      await waitFor(() => {
        expect(screen.getByText('Allowed destinations')).toBeInTheDocument()
      })
      expect(screen.getByLabelText('Anywhere')).toBeInTheDocument()
      expect(screen.getByLabelText('Selected destinations')).toBeInTheDocument()
    })

    it('defaults to anywhere when proxy mode is selected', async () => {
      const routerWithProxy = createTestRouter(() => (
        <TestWrapper initialValues={{ networkAccess: 'proxy' }} />
      ))

      renderRoute(routerWithProxy)

      await waitFor(() => {
        expect(screen.getByLabelText('Anywhere')).toBeChecked()
      })
    })
  })

  describe('Alert display', () => {
    it('shows alert when restricting to selected destinations with no hosts or ports configured', async () => {
      const routerWithProxy = createTestRouter(() => (
        <TestWrapper initialValues={{ networkAccess: 'proxy' }} />
      ))

      renderRoute(routerWithProxy)

      await waitFor(() => {
        expect(
          screen.getByLabelText('Selected destinations')
        ).toBeInTheDocument()
      })

      await userEvent.click(screen.getByLabelText('Selected destinations'))

      await waitFor(() => {
        expect(
          screen.getByText(
            'This configuration blocks all outbound network traffic from the MCP server.'
          )
        ).toBeInTheDocument()
      })
    })

    it('hides the empty-allow-list warning when hosts are configured', async () => {
      const routerWithHosts = createTestRouter(() => (
        <TestWrapper
          initialValues={{
            networkAccess: 'proxy',
            allowedDestinations: 'selected',
            allowedHosts: [{ value: 'example.com' }],
            allowedPorts: [],
          }}
        />
      ))

      renderRoute(routerWithHosts)

      await waitFor(() => {
        expect(screen.getByText('Allowed hosts')).toBeInTheDocument()
      })

      expect(
        screen.queryByText(
          'This configuration blocks all outbound network traffic from the MCP server.'
        )
      ).not.toBeInTheDocument()
    })

    it('hides the empty-allow-list warning when ports are configured', async () => {
      const routerWithPorts = createTestRouter(() => (
        <TestWrapper
          initialValues={{
            networkAccess: 'proxy',
            allowedDestinations: 'selected',
            allowedHosts: [],
            allowedPorts: [{ value: '8080' }],
          }}
        />
      ))

      renderRoute(routerWithPorts)

      await waitFor(() => {
        expect(screen.getByText('Allowed ports')).toBeInTheDocument()
      })

      expect(
        screen.queryByText(
          'This configuration blocks all outbound network traffic from the MCP server.'
        )
      ).not.toBeInTheDocument()
    })
  })

  describe('Dynamic array fields', () => {
    it('does not render host/port fields when allowed destinations is anywhere', async () => {
      const routerWithProxy = createTestRouter(() => (
        <TestWrapper initialValues={{ networkAccess: 'proxy' }} />
      ))

      renderRoute(routerWithProxy)

      await waitFor(() => {
        expect(screen.getByLabelText('Anywhere')).toBeInTheDocument()
      })

      expect(screen.queryByText('Allowed hosts')).not.toBeInTheDocument()
      expect(screen.queryByText('Allowed ports')).not.toBeInTheDocument()
    })

    it('shows titles with collapsed add-host/add-port triggers, but no input rows, when selected destinations is chosen', async () => {
      const routerWithProxy = createTestRouter(() => (
        <TestWrapper initialValues={{ networkAccess: 'proxy' }} />
      ))

      renderRoute(routerWithProxy)

      await waitFor(() => {
        expect(
          screen.getByLabelText('Selected destinations')
        ).toBeInTheDocument()
      })

      await userEvent.click(screen.getByLabelText('Selected destinations'))

      await waitFor(() => {
        expect(screen.getByText('Allowed hosts')).toBeInTheDocument()
      })
      expect(screen.getByText('Allowed ports')).toBeInTheDocument()
      expect(screen.getByText('Add a host')).toBeInTheDocument()
      expect(screen.getByText('Add a port')).toBeInTheDocument()
      expect(screen.queryByLabelText('Host 1')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Port 1')).not.toBeInTheDocument()
    })

    it('reveals the Host/Port input rows only after their add button is pressed', async () => {
      const routerWithProxy = createTestRouter(() => (
        <TestWrapper
          initialValues={{
            networkAccess: 'proxy',
            allowedDestinations: 'selected',
          }}
        />
      ))

      renderRoute(routerWithProxy)

      await waitFor(() => {
        expect(screen.getByText('Add a host')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByText('Add a host'))

      await waitFor(() => {
        expect(screen.getByLabelText('Host 1')).toBeInTheDocument()
      })
      // Ports remain collapsed until its own add button is pressed
      expect(screen.queryByLabelText('Port 1')).not.toBeInTheDocument()
    })

    it('allows adding a host when restricted to selected destinations', async () => {
      const routerWithProxy = createTestRouter(() => (
        <TestWrapper
          initialValues={{
            networkAccess: 'proxy',
            allowedDestinations: 'selected',
          }}
        />
      ))

      renderRoute(routerWithProxy)

      await waitFor(() => {
        expect(screen.getByText('Add a host')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByText('Add a host'))

      await waitFor(() => {
        expect(screen.getByLabelText('Host 1')).toBeInTheDocument()
      })
    })

    it('allows adding a port when restricted to selected destinations', async () => {
      const routerWithProxy = createTestRouter(() => (
        <TestWrapper
          initialValues={{
            networkAccess: 'proxy',
            allowedDestinations: 'selected',
          }}
        />
      ))

      renderRoute(routerWithProxy)

      await waitFor(() => {
        expect(screen.getByText('Add a port')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByText('Add a port'))

      await waitFor(() => {
        expect(screen.getByLabelText('Port 1')).toBeInTheDocument()
      })
    })
  })

  describe('Allow host machine access', () => {
    it('renders the host access checkbox in proxy mode', async () => {
      const routerWithProxy = createTestRouter(() => (
        <TestWrapper initialValues={{ networkAccess: 'proxy' }} />
      ))

      renderRoute(routerWithProxy)

      await waitFor(() => {
        expect(
          screen.getByLabelText('Allow host machine access')
        ).toBeInTheDocument()
      })
      expect(
        screen.getByLabelText('Allow host machine access')
      ).not.toBeChecked()
    })

    it('does not render the host access checkbox outside proxy mode', async () => {
      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByLabelText('No isolation')).toBeInTheDocument()
      })

      expect(
        screen.queryByLabelText('Allow host machine access')
      ).not.toBeInTheDocument()
    })

    it('toggles the checkbox when clicked', async () => {
      const routerWithProxy = createTestRouter(() => (
        <TestWrapper initialValues={{ networkAccess: 'proxy' }} />
      ))

      renderRoute(routerWithProxy)

      await waitFor(() => {
        expect(
          screen.getByLabelText('Allow host machine access')
        ).toBeInTheDocument()
      })

      await userEvent.click(screen.getByLabelText('Allow host machine access'))

      await waitFor(() => {
        expect(screen.getByLabelText('Allow host machine access')).toBeChecked()
      })
    })
  })
})
