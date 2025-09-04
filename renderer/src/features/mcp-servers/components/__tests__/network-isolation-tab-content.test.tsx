import { screen, waitFor } from '@testing-library/react'
import { expect, it, describe } from 'vitest'
import { useForm } from 'react-hook-form'
import userEvent from '@testing-library/user-event'
import { NetworkIsolationTabContent } from '../network-isolation-tab-content'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import { Form } from '@/common/components/ui/form'
import type { FormSchemaLocalMcp } from '../../lib/form-schema-local-mcp'

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
      networkIsolation: false,
      allowedHosts: [],
      allowedPorts: [],
      ...initialValues,
    },
  })

  return (
    <Form {...form}>
      <NetworkIsolationTabContent form={form} />
    </Form>
  )
}

const router = createTestRouter(() => <TestWrapper />)

describe('NetworkIsolationTabContent', () => {
  describe('Switch functionality', () => {
    it('renders the network isolation switch with correct label', async () => {
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByLabelText('Enable outbound network filtering')
        ).toBeInTheDocument()
      })

      const switchElement = screen.getByRole('switch')
      expect(switchElement).toBeInTheDocument()
      expect(switchElement).not.toBeChecked()
    })

    it('toggles the switch state when clicked', async () => {
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByLabelText('Enable outbound network filtering')
        ).toBeInTheDocument()
      })

      const switchElement = screen.getByRole('switch')
      expect(switchElement).not.toBeChecked()

      await userEvent.click(switchElement)

      await waitFor(() => {
        expect(switchElement).toBeChecked()
      })
    })

    it('shows the switch label correctly', async () => {
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByText('Enable outbound network filtering')
        ).toBeInTheDocument()
      })
    })
  })

  describe('Alert display', () => {
    it('shows alert when network isolation is enabled but no hosts or ports are configured', async () => {
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByLabelText('Enable outbound network filtering')
        ).toBeInTheDocument()
      })

      // Enable network isolation
      const switchElement = screen.getByRole('switch')
      await userEvent.click(switchElement)

      await waitFor(() => {
        expect(
          screen.getByText(
            'This configuration blocks all outbound network traffic from the MCP server.'
          )
        ).toBeInTheDocument()
      })

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('hides alert when hosts are configured', async () => {
      const routerWithHosts = createTestRouter(() => (
        <TestWrapper
          initialValues={{
            networkIsolation: true,
            allowedHosts: [{ value: 'example.com' }],
            allowedPorts: [],
          }}
        />
      ))

      renderRoute(routerWithHosts)

      await waitFor(() => {
        expect(
          screen.getByLabelText('Enable outbound network filtering')
        ).toBeInTheDocument()
      })

      expect(
        screen.queryByText(
          'This configuration blocks all outbound network traffic from the MCP server.'
        )
      ).not.toBeInTheDocument()
    })

    it('hides alert when ports are configured', async () => {
      const routerWithPorts = createTestRouter(() => (
        <TestWrapper
          initialValues={{
            networkIsolation: true,
            allowedHosts: [],
            allowedPorts: [{ value: '8080' }],
          }}
        />
      ))

      renderRoute(routerWithPorts)

      await waitFor(() => {
        expect(
          screen.getByLabelText('Enable outbound network filtering')
        ).toBeInTheDocument()
      })

      expect(
        screen.queryByText(
          'This configuration blocks all outbound network traffic from the MCP server.'
        )
      ).not.toBeInTheDocument()
    })

    it('hides alert when both hosts and ports are configured', async () => {
      const routerWithBoth = createTestRouter(() => (
        <TestWrapper
          initialValues={{
            networkIsolation: true,
            allowedHosts: [{ value: 'example.com' }],
            allowedPorts: [{ value: '8080' }],
          }}
        />
      ))

      renderRoute(routerWithBoth)

      await waitFor(() => {
        expect(
          screen.getByLabelText('Enable outbound network filtering')
        ).toBeInTheDocument()
      })

      expect(
        screen.queryByText(
          'This configuration blocks all outbound network traffic from the MCP server.'
        )
      ).not.toBeInTheDocument()
    })
  })

  describe('Dynamic array fields', () => {
    it('renders allowed hosts field when network isolation is enabled', async () => {
      const routerWithNetworkIsolation = createTestRouter(() => (
        <TestWrapper
          initialValues={{
            networkIsolation: true,
          }}
        />
      ))

      renderRoute(routerWithNetworkIsolation)

      await waitFor(() => {
        expect(screen.getByText('Allowed hosts')).toBeInTheDocument()
      })

      expect(screen.getByText('Add a host')).toBeInTheDocument()
    })

    it('renders allowed ports field when network isolation is enabled', async () => {
      const routerWithNetworkIsolation = createTestRouter(() => (
        <TestWrapper
          initialValues={{
            networkIsolation: true,
          }}
        />
      ))

      renderRoute(routerWithNetworkIsolation)

      await waitFor(() => {
        expect(screen.getByText('Allowed ports')).toBeInTheDocument()
      })

      expect(screen.getByText('Add a port')).toBeInTheDocument()
    })

    it('does not render fields when network isolation is disabled', async () => {
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByLabelText('Enable outbound network filtering')
        ).toBeInTheDocument()
      })

      expect(screen.queryByText('Allowed hosts')).not.toBeInTheDocument()
      expect(screen.queryByText('Allowed ports')).not.toBeInTheDocument()
    })

    it('shows fields when network isolation is toggled on', async () => {
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByLabelText('Enable outbound network filtering')
        ).toBeInTheDocument()
      })

      // Initially fields should not be present
      expect(screen.queryByText('Allowed hosts')).not.toBeInTheDocument()
      expect(screen.queryByText('Allowed ports')).not.toBeInTheDocument()

      // Enable network isolation
      const switchElement = screen.getByRole('switch')
      await userEvent.click(switchElement)

      // Fields should now be present
      await waitFor(() => {
        expect(screen.getByText('Allowed hosts')).toBeInTheDocument()
      })
      expect(screen.getByText('Allowed ports')).toBeInTheDocument()
    })

    it('allows adding hosts when network isolation is enabled', async () => {
      const routerWithNetworkIsolation = createTestRouter(() => (
        <TestWrapper
          initialValues={{
            networkIsolation: true,
          }}
        />
      ))

      renderRoute(routerWithNetworkIsolation)

      await waitFor(() => {
        expect(screen.getByText('Add a host')).toBeInTheDocument()
      })

      const addHostButton = screen.getByText('Add a host')
      await userEvent.click(addHostButton)

      await waitFor(() => {
        expect(screen.getByLabelText('Host 1')).toBeInTheDocument()
      })
    })

    it('allows adding ports when network isolation is enabled', async () => {
      const routerWithNetworkIsolation = createTestRouter(() => (
        <TestWrapper
          initialValues={{
            networkIsolation: true,
          }}
        />
      ))

      renderRoute(routerWithNetworkIsolation)

      await waitFor(() => {
        expect(screen.getByText('Add a port')).toBeInTheDocument()
      })

      const addPortButton = screen.getByText('Add a port')
      await userEvent.click(addPortButton)

      await waitFor(() => {
        expect(screen.getByLabelText('Port 1')).toBeInTheDocument()
      })
    })
  })

  describe('Component structure', () => {
    it('renders with correct layout and styling', async () => {
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByLabelText('Enable outbound network filtering')
        ).toBeInTheDocument()
      })

      // Check that the main container has the expected padding
      const container = screen
        .getByLabelText('Enable outbound network filtering')
        .closest('.p-6')
      expect(container).toBeInTheDocument()

      // Check that the switch container has the expected styling
      const switchContainer = screen
        .getByLabelText('Enable outbound network filtering')
        .closest('.mb-4')
      expect(switchContainer).toBeInTheDocument()
    })

    it('renders with network isolation initially disabled', async () => {
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByLabelText('Enable outbound network filtering')
        ).toBeInTheDocument()
      })

      const switchElement = screen.getByRole('switch')
      expect(switchElement).not.toBeChecked()
    })

    it('renders with network isolation enabled when provided in initial values', async () => {
      const routerWithEnabled = createTestRouter(() => (
        <TestWrapper
          initialValues={{
            networkIsolation: true,
          }}
        />
      ))

      renderRoute(routerWithEnabled)

      await waitFor(() => {
        expect(
          screen.getByLabelText('Enable outbound network filtering')
        ).toBeInTheDocument()
      })

      const switchElement = screen.getByRole('switch')
      expect(switchElement).toBeChecked()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByLabelText('Enable outbound network filtering')
        ).toBeInTheDocument()
      })

      const switchElement = screen.getByRole('switch')
      expect(switchElement).toHaveAttribute(
        'aria-label',
        'Enable outbound network filtering'
      )
      expect(switchElement).toHaveAttribute('id', 'network-isolation-switch')

      const label = screen.getByText('Enable outbound network filtering')
      expect(label).toHaveAttribute('for', 'network-isolation-switch')
    })

    it('has proper alert role when alert is shown', async () => {
      const routerWithAlert = createTestRouter(() => (
        <TestWrapper
          initialValues={{
            networkIsolation: true,
          }}
        />
      ))

      renderRoute(routerWithAlert)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })
  })
})
