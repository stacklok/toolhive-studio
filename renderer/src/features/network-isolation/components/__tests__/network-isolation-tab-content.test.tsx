import { render, screen } from '@testing-library/react'
import { it, expect, vi, describe, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { NetworkIsolationTabContent } from '../network-isolation-tab-content'

// Mock the DynamicArrayField component
vi.mock('../../../registry-servers/components/dynamic-array-field', () => ({
  DynamicArrayField: vi.fn(
    ({ label, inputLabelPrefix, addButtonText, type }) => (
      <div
        data-testid={`dynamic-array-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <label>{label}</label>
        <button type="button">{addButtonText}</button>
        <input type={type || 'text'} aria-label={`${inputLabelPrefix} 1`} />
        <button type="button" aria-label={`Remove ${inputLabelPrefix} 1`}>
          Remove
        </button>
      </div>
    )
  ),
}))

// Define a simple type for testing
type TestFormData = {
  networkIsolation: boolean
  allowedHosts: string[]
  allowedPorts: string[]
}

// Test wrapper component that provides the form context
function TestWrapper({
  defaultValues = {
    networkIsolation: false,
    allowedHosts: [],
    allowedPorts: [],
  },
}: {
  defaultValues?: Partial<TestFormData>
}) {
  const form = useForm<TestFormData>({
    defaultValues: {
      networkIsolation: false,
      allowedHosts: [],
      allowedPorts: [],
      ...defaultValues,
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <NetworkIsolationTabContent form={form as any} />
}

describe('NetworkIsolationTabContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Switch Rendering and Interaction', () => {
    it('renders switch with correct initial state', async () => {
      render(<TestWrapper />)

      const switchLabel = screen.getByLabelText(
        'Enable outbound network filtering'
      )
      expect(switchLabel).toBeInTheDocument()
      expect(switchLabel).toHaveAttribute('role', 'switch')
      expect(switchLabel).toHaveAttribute('aria-checked', 'false')
    })

    it('renders switch with correct label and accessibility', async () => {
      render(<TestWrapper />)

      const switchLabel = screen.getByLabelText(
        'Enable outbound network filtering'
      )
      expect(switchLabel).toBeInTheDocument()

      // Check that the label is properly associated
      const label = screen.getByText('Enable outbound network filtering')
      expect(label).toBeInTheDocument()
    })

    it('toggles switch state correctly', async () => {
      render(<TestWrapper />)

      const switchLabel = screen.getByLabelText(
        'Enable outbound network filtering'
      )

      // Initially unchecked
      expect(switchLabel).toHaveAttribute('aria-checked', 'false')

      // Click to enable
      await userEvent.click(switchLabel)
      expect(switchLabel).toHaveAttribute('aria-checked', 'true')

      // Click to disable
      await userEvent.click(switchLabel)
      expect(switchLabel).toHaveAttribute('aria-checked', 'false')
    })
  })

  describe('Conditional Rendering', () => {
    it('shows/hides fields based on switch state', async () => {
      render(<TestWrapper />)

      // Initially, fields should not be visible
      expect(
        screen.queryByTestId('dynamic-array-allowed-hosts')
      ).not.toBeInTheDocument()
      expect(
        screen.queryByTestId('dynamic-array-allowed-ports')
      ).not.toBeInTheDocument()

      // Enable the switch
      const switchLabel = screen.getByLabelText(
        'Enable outbound network filtering'
      )
      await userEvent.click(switchLabel)

      // Now fields should be visible
      expect(
        screen.getByTestId('dynamic-array-allowed-hosts')
      ).toBeInTheDocument()
      expect(
        screen.getByTestId('dynamic-array-allowed-ports')
      ).toBeInTheDocument()
    })

    it('renders Allowed Hosts field in the network isolation tab when enabled', async () => {
      render(<TestWrapper defaultValues={{ networkIsolation: true }} />)

      expect(
        screen.getByTestId('dynamic-array-allowed-hosts')
      ).toBeInTheDocument()
      expect(screen.getByText('Allowed hosts')).toBeInTheDocument()
      expect(screen.getByText('Add a host')).toBeInTheDocument()
    })

    it('renders Allowed Ports field in the network isolation tab when enabled', async () => {
      render(<TestWrapper defaultValues={{ networkIsolation: true }} />)

      expect(
        screen.getByTestId('dynamic-array-allowed-ports')
      ).toBeInTheDocument()
      expect(screen.getByText('Allowed ports')).toBeInTheDocument()
      expect(screen.getByText('Add a port')).toBeInTheDocument()
    })
  })

  describe('Alert Logic', () => {
    it('shows an alert when network isolation is enabled', async () => {
      render(<TestWrapper defaultValues={{ networkIsolation: true }} />)

      expect(
        screen.getByText(
          /this configuration blocks all outbound network traffic from the mcp server/i
        )
      ).toBeInTheDocument()
    })

    it('shows the alert only when hosts or ports are empty', async () => {
      render(<TestWrapper defaultValues={{ networkIsolation: true }} />)

      // By default, all are empty, so alert should show
      expect(
        screen.getByText(
          /this configuration blocks all outbound network traffic from the mcp server/i
        )
      ).toBeInTheDocument()

      // Add a host
      const addHostBtn = screen.getByRole('button', { name: /add a host/i })
      await userEvent.click(addHostBtn)
      const hostInput = screen.getByLabelText('Host 1')
      await userEvent.type(hostInput, 'example.com')

      // Alert should disappear when host is added
      expect(
        screen.queryByText(
          /this configuration blocks all outbound network traffic from the mcp server/i
        )
      ).not.toBeInTheDocument()

      // Add a port
      const addPortBtn = screen.getByRole('button', { name: /add a port/i })
      await userEvent.click(addPortBtn)
      const portInput = screen.getByLabelText('Port 1')
      await userEvent.type(portInput, '8080')

      // Alert should still not be present
      expect(
        screen.queryByText(
          /this configuration blocks all outbound network traffic from the mcp server/i
        )
      ).not.toBeInTheDocument()

      // Remove the host
      const removeHostBtn = screen.getByLabelText('Remove Host 1')
      await userEvent.click(removeHostBtn)

      // Alert should still not be present because port is still there
      expect(
        screen.queryByText(
          /this configuration blocks all outbound network traffic from the mcp server/i
        )
      ).not.toBeInTheDocument()
    })
  })

  describe('Field Interactions', () => {
    it('allows adding and removing hosts', async () => {
      render(<TestWrapper defaultValues={{ networkIsolation: true }} />)

      const addHostBtn = screen.getByRole('button', { name: /add a host/i })
      await userEvent.click(addHostBtn)

      const hostInput = screen.getByLabelText('Host 1')
      expect(hostInput).toBeInTheDocument()

      await userEvent.type(hostInput, 'example.com')
      expect(hostInput).toHaveValue('example.com')

      const removeHostBtn = screen.getByLabelText('Remove Host 1')
      await userEvent.click(removeHostBtn)

      expect(screen.queryByLabelText('Host 1')).not.toBeInTheDocument()
    })

    it('allows adding and removing ports', async () => {
      render(<TestWrapper defaultValues={{ networkIsolation: true }} />)

      const addPortBtn = screen.getByRole('button', { name: /add a port/i })
      await userEvent.click(addPortBtn)

      const portInput = screen.getByLabelText('Port 1')
      expect(portInput).toBeInTheDocument()

      await userEvent.type(portInput, '8080')
      expect(portInput).toHaveValue('8080')

      const removePortBtn = screen.getByLabelText('Remove Port 1')
      await userEvent.click(removePortBtn)

      expect(screen.queryByLabelText('Port 1')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', async () => {
      render(<TestWrapper />)

      const switchLabel = screen.getByLabelText(
        'Enable outbound network filtering'
      )
      expect(switchLabel).toHaveAttribute('role', 'switch')
      expect(switchLabel).toHaveAttribute('aria-checked', 'false')
    })

    it('supports keyboard navigation', async () => {
      render(<TestWrapper />)

      const switchLabel = screen.getByLabelText(
        'Enable outbound network filtering'
      )

      // Focus the switch
      switchLabel.focus()
      expect(switchLabel).toHaveFocus()

      // Toggle with space key
      await userEvent.keyboard(' ')
      expect(switchLabel).toHaveAttribute('aria-checked', 'true')
    })
  })
})
