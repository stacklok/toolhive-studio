import { screen, waitFor } from '@testing-library/react'
import { expect, it, describe } from 'vitest'
import { useForm } from 'react-hook-form'
import { NetworkAccessTabTriggerLabel } from '../network-access-tab-trigger-label'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import { Form } from '@/common/components/ui/form'
import type { FormSchemaLocalMcp } from '@/features/mcp-servers/lib/form-schema-local-mcp'
import type { NetworkAccessMode } from '@/common/lib/form-schema-mcp'

function TestWrapper({
  networkAccess = 'none',
}: {
  networkAccess?: NetworkAccessMode
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
      networkAccess,
      allowedDestinations: 'anywhere',
      allowHostAccess: false,
      allowedHosts: [],
      allowedPorts: [],
    },
  })

  return (
    <Form {...form}>
      <NetworkAccessTabTriggerLabel form={form} />
    </Form>
  )
}

describe('NetworkAccessTabTriggerLabel', () => {
  it('shows "Not isolated" text when no isolation is selected', async () => {
    const router = createTestRouter(() => <TestWrapper networkAccess="none" />)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('Not isolated')).toBeInTheDocument()
    })
    expect(screen.queryByText('Isolated')).not.toBeInTheDocument()
  })

  it('shows "Not isolated" text when host networking is selected', async () => {
    const router = createTestRouter(() => <TestWrapper networkAccess="host" />)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('Not isolated')).toBeInTheDocument()
    })
  })

  it('shows "Isolated" text when proxy mode is selected', async () => {
    const router = createTestRouter(() => <TestWrapper networkAccess="proxy" />)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('Isolated')).toBeInTheDocument()
    })
    expect(screen.queryByText('Not isolated')).not.toBeInTheDocument()
  })

  it('always renders the "Network access" label alongside the status', async () => {
    const router = createTestRouter(() => <TestWrapper networkAccess="proxy" />)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('Network access')).toBeInTheDocument()
    })
  })
})
