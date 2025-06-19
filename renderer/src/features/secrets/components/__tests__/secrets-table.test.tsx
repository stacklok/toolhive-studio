import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SecretsTable } from '../secrets-table'

const mockSecrets = [
  { key: 'Github' },
  { key: 'Grafana' },
  { key: 'Slack' },
  { key: 'Jira' },
]

describe('SecretsTable', () => {
  it('should render the table with secrets', async () => {
    render(<SecretsTable secrets={mockSecrets} />)

    expect(screen.getByText('Secrets')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /add secret/i })
    ).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Filter secrets...')).toBeInTheDocument()

    expect(screen.getByText('Github')).toBeInTheDocument()
    expect(screen.getByText('Grafana')).toBeInTheDocument()
    expect(screen.getByText('Slack')).toBeInTheDocument()
    expect(screen.getByText('Jira')).toBeInTheDocument()

    const dropdownTriggers = screen.getAllByLabelText('Secret options')
    expect(dropdownTriggers).toHaveLength(4)

    await userEvent.click(dropdownTriggers[0]!)

    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })
})
