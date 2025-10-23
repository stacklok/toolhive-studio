import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OptimizerWarnings } from '../optimizer-warnings'
import { MCP_OPTIMIZER_GROUP_NAME } from '@/common/lib/constants'
import type { GroupWithServers } from '../../hooks/use-mcp-optimizer-groups'

describe('OptimizerWarnings', () => {
  it('renders the experimental feature warning', () => {
    render(<OptimizerWarnings groups={[]} />)

    expect(screen.getByText('Experimental Feature')).toBeInTheDocument()
    expect(
      screen.getByText(
        'This is an experimental feature currently under development.'
      )
    ).toBeInTheDocument()
  })

  it('renders only one alert when clients are registered', () => {
    const groups: GroupWithServers[] = [
      {
        name: MCP_OPTIMIZER_GROUP_NAME,
        registered_clients: ['vscode', 'cursor'],
        servers: [],
      },
    ]
    const { container } = render(<OptimizerWarnings groups={groups} />)

    const alerts = container.querySelectorAll('[role="alert"]')
    expect(alerts).toHaveLength(1)
  })

  it('renders no clients registered alert when optimizer group has no clients', () => {
    const groups: GroupWithServers[] = [
      {
        name: MCP_OPTIMIZER_GROUP_NAME,
        registered_clients: [],
        servers: [],
      },
    ]
    render(<OptimizerWarnings groups={groups} />)

    expect(screen.getByText('No clients registered')).toBeInTheDocument()
    expect(
      screen.getByText(
        'We recommend registering clients in the MCP Optimizer group.'
      )
    ).toBeInTheDocument()
  })

  it('renders two alerts when no clients are registered', () => {
    const groups: GroupWithServers[] = [
      {
        name: MCP_OPTIMIZER_GROUP_NAME,
        registered_clients: [],
        servers: [],
      },
    ]
    const { container } = render(<OptimizerWarnings groups={groups} />)

    const alerts = container.querySelectorAll('[role="alert"]')
    expect(alerts).toHaveLength(2)
  })
})
