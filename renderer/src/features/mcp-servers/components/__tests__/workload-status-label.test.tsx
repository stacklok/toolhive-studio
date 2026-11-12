import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { WorkloadStatusLabel } from '../workload-status-label'

describe('WorkloadStatusLabel', () => {
  it.each([
    ['unauthenticated', 'Authentication required'],
    ['auth_retrying', 'Retrying authentication'],
    ['policy_stopped', 'Stopped by policy'],
  ] as const)('shows %s as a warning labelled "%s"', (status, label) => {
    render(<WorkloadStatusLabel status={status} />)

    const element = screen.getByText(label)
    expect(element).toHaveClass('text-warning')
    expect(element).not.toHaveClass('capitalize')
  })

  it('shows other statuses as muted, capitalized text', () => {
    render(<WorkloadStatusLabel status="running" />)

    const element = screen.getByText('running')
    expect(element).toHaveClass('text-muted-foreground', 'capitalize')
    expect(element).not.toHaveClass('text-warning')
  })

  it('maps removing to Deleting', () => {
    render(<WorkloadStatusLabel status="removing" />)

    expect(screen.getByText('Deleting')).toBeVisible()
  })

  it('shows the status context in a tooltip for warning statuses', async () => {
    const user = userEvent.setup()
    render(
      <WorkloadStatusLabel
        status="unauthenticated"
        statusContext="Bearer token authentication failed. Please restart the server with a new token"
      />
    )

    await user.hover(screen.getByText('Authentication required'))

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent(
        'Bearer token authentication failed. Please restart the server with a new token'
      )
    })
  })

  it('does not show a tooltip for non-warning statuses', async () => {
    const user = userEvent.setup()
    render(
      <WorkloadStatusLabel status="running" statusContext="Up 5 minutes" />
    )

    await user.hover(screen.getByText('running'))

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
