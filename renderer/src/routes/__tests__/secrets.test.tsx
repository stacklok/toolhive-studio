import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createTestRouter } from '@/common/test/create-test-router'
import { Secrets } from '../secrets'
import { renderRoute } from '@/common/test/render-route'

const router = createTestRouter(Secrets)

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks()
})

it('renders the table with secrets', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(
      screen.getByRole('heading', { name: /secrets/i })
    ).toBeInTheDocument()
  })
  expect(
    screen.getByRole('button', { name: /add secret/i })
  ).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()

  expect(screen.getByText('Github')).toBeInTheDocument()
  expect(screen.getByText('Grafana')).toBeInTheDocument()
  expect(screen.getByText('Slack')).toBeInTheDocument()
  expect(screen.getByText('Jira')).toBeInTheDocument()

  const dropdownTriggers = screen.getAllByLabelText('Secret options')
  expect(dropdownTriggers).toHaveLength(4)

  await userEvent.click(dropdownTriggers[0]!)

  expect(screen.getByText('Update secret')).toBeInTheDocument()
  expect(screen.getByText('Delete')).toBeInTheDocument()
})

it('renders add secret dialog when clicking add secret button', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(
      screen.getByRole('heading', { name: /secrets/i })
    ).toBeInTheDocument()
  })

  const addSecretButton = screen.getByRole('button', { name: /add secret/i })
  await userEvent.click(addSecretButton)

  expect(screen.getByPlaceholderText('Name')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Secret')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()

  // Accessibility: check sr-only description and aria-describedby
  const dialog = screen.getByRole('dialog')
  const srDescription = Array.from(dialog.querySelectorAll('p,div,span')).find(
    (el) =>
      el.className.includes('sr-only') &&
      el.textContent?.includes('Enter a name and value for your new secret.')
  )
  expect(srDescription).toBeTruthy()
  const ariaDescribedBy = dialog.getAttribute('aria-describedby')
  expect(ariaDescribedBy).toBeTruthy()
  expect(srDescription?.id).toBe(ariaDescribedBy)
})

it('renders edit secret dialog when clicking edit from dropdown', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(
      screen.getByRole('heading', { name: /secrets/i })
    ).toBeInTheDocument()
  })
  const dropdownTriggers = screen.getAllByLabelText('Secret options')
  await userEvent.click(dropdownTriggers[0]!)

  const editButton = screen.getByText('Update secret')
  await userEvent.click(editButton)

  expect(screen.getByText('Update the secret value below.')).toBeInTheDocument()
  expect(screen.queryByPlaceholderText('Name')).not.toBeInTheDocument()
  expect(screen.getByPlaceholderText('Secret')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()

  // Accessibility: check sr-only and aria-describedby
  const dialog = screen.getByRole('dialog')
  const srDescription = Array.from(dialog.querySelectorAll('p,div,span')).find(
    (el) =>
      el.className.includes('sr-only') &&
      el.textContent?.includes('Update the secret value below.')
  )
  expect(srDescription).toBeTruthy()
  const ariaDescribedBy = dialog.getAttribute('aria-describedby')
  expect(ariaDescribedBy).toBeTruthy()
  expect(srDescription?.id).toBe(ariaDescribedBy)
})

it('displays the secret name in a read-only input when editing a secret', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(
      screen.getByRole('heading', { name: /secrets/i })
    ).toBeInTheDocument()
  })
  const dropdownTriggers = screen.getAllByLabelText('Secret options')
  await userEvent.click(dropdownTriggers[0]!)
  const editButton = screen.getByText('Update secret')
  await userEvent.click(editButton)

  const secretNameInput = screen.getByDisplayValue('Github')
  expect(secretNameInput).toBeInTheDocument()
  expect(secretNameInput).toHaveAttribute('readonly')
  expect(secretNameInput).toBeDisabled()
})
