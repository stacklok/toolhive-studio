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

  it('should render add secret dialog when clicking add secret button', async () => {
    const user = userEvent.setup()
    render(<SecretsTable secrets={mockSecrets} />)

    const addSecretButton = screen.getByRole('button', { name: /add secret/i })
    await user.click(addSecretButton)

    expect(
      screen.getByText('Enter a name and value for your new secret.')
    ).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Secret')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('should render edit secret dialog when clicking edit from dropdown', async () => {
    const user = userEvent.setup()
    render(<SecretsTable secrets={mockSecrets} />)

    const dropdownTriggers = screen.getAllByLabelText('Secret options')
    await user.click(dropdownTriggers[0]!)

    const editButton = screen.getByText('Edit')
    await user.click(editButton)

    expect(
      screen.getByText('Update the secret value below.')
    ).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Name')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Secret')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })
})
