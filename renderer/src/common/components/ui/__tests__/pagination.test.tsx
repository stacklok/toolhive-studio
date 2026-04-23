import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from '../pagination'

function setup(props: Partial<React.ComponentProps<typeof Pagination>> = {}) {
  const onPageChange = vi.fn()
  const onPageSizeChange = vi.fn()
  const utils = render(
    <Pagination
      page={1}
      pageSize={12}
      total={100}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      {...props}
    />
  )
  return { onPageChange, onPageSizeChange, ...utils }
}

describe('Pagination', () => {
  it('renders "Showing X-Y of N" info, current page and controls', () => {
    setup({ page: 2, pageSize: 12, total: 100 })

    expect(screen.getByText('Showing 13-24 of 100 results')).toBeVisible()
    expect(screen.getByText('Page 2')).toBeVisible()
    expect(
      screen.getByRole('button', { name: /go to first page/i })
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: /go to previous page/i })
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: /go to next page/i })
    ).toBeVisible()
  })

  it('uses a custom item label', () => {
    setup({ total: 100, itemLabel: 'skills' })
    expect(screen.getByText('Showing 1-12 of 100 skills')).toBeVisible()
  })

  it('disables first and previous on page 1', () => {
    setup({ page: 1, pageSize: 12, total: 100 })

    expect(
      screen.getByRole('button', { name: /go to first page/i })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /go to previous page/i })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /go to next page/i })
    ).toBeEnabled()
  })

  it('disables next on the last page', () => {
    setup({ page: 9, pageSize: 12, total: 100 })

    expect(
      screen.getByRole('button', { name: /go to next page/i })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /go to previous page/i })
    ).toBeEnabled()
  })

  it('invokes onPageChange when navigation buttons are clicked', async () => {
    const user = userEvent.setup()
    const { onPageChange } = setup({ page: 3, pageSize: 12, total: 100 })

    await user.click(screen.getByRole('button', { name: /go to next page/i }))
    expect(onPageChange).toHaveBeenCalledWith(4)

    await user.click(
      screen.getByRole('button', { name: /go to previous page/i })
    )
    expect(onPageChange).toHaveBeenCalledWith(2)

    await user.click(screen.getByRole('button', { name: /go to first page/i }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('invokes onPageSizeChange when a new size is selected', async () => {
    const user = userEvent.setup()
    const { onPageSizeChange } = setup({ page: 1, pageSize: 12, total: 500 })

    await user.click(screen.getByRole('combobox', { name: /items per page/i }))
    await user.click(screen.getByRole('option', { name: '50' }))

    expect(onPageSizeChange).toHaveBeenCalledWith(50)
  })

  it('renders nothing when total fits in the smallest page size option', () => {
    const { container } = setup({ page: 1, pageSize: 12, total: 5 })
    expect(container).toBeEmptyDOMElement()
  })
})
