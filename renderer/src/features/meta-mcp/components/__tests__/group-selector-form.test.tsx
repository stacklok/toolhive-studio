import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GroupSelectorForm } from '../group-selector-form'

describe('GroupSelectorForm', () => {
  const mockGroups = [
    { name: 'default', servers: ['server1', 'server2'] },
    { name: 'production', servers: ['server3'] },
    { name: 'development', servers: [] },
  ]

  it('renders all group options', () => {
    render(<GroupSelectorForm groups={mockGroups} />)

    expect(screen.getByText('default')).toBeInTheDocument()
    expect(screen.getByText('production')).toBeInTheDocument()
    expect(screen.getByText('development')).toBeInTheDocument()
  })

  it('displays server names for each group', () => {
    render(<GroupSelectorForm groups={mockGroups} />)

    expect(screen.getByText('server1, server2')).toBeInTheDocument()
    expect(screen.getByText('server3')).toBeInTheDocument()
    expect(screen.getByText('No servers')).toBeInTheDocument()
  })

  it('renders the Apply Changes button', () => {
    render(<GroupSelectorForm groups={mockGroups} />)

    expect(
      screen.getByRole('button', { name: /apply changes/i })
    ).toBeInTheDocument()
  })

  it('renders radio buttons for each group', () => {
    render(<GroupSelectorForm groups={mockGroups} />)

    const radioButtons = screen.getAllByRole('radio')
    expect(radioButtons).toHaveLength(3)
  })

  it('allows selecting a group', async () => {
    const user = userEvent.setup()

    render(<GroupSelectorForm groups={mockGroups} />)

    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    expect(defaultRadio).not.toBeChecked()

    await user.click(defaultRadio)
    expect(defaultRadio).toBeChecked()
  })

  it('handles empty groups array', () => {
    render(<GroupSelectorForm groups={[]} />)

    const radioButtons = screen.queryAllByRole('radio')
    expect(radioButtons).toHaveLength(0)

    expect(
      screen.getByRole('button', { name: /apply changes/i })
    ).toBeInTheDocument()
  })
})
