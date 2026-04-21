import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ViewToggle } from '../view-toggle'

describe('ViewToggle', () => {
  it('marks the card option as checked when value is "card"', () => {
    render(<ViewToggle value="card" onChange={vi.fn()} />)

    expect(screen.getByRole('radio', { name: /card view/i })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(screen.getByRole('radio', { name: /table view/i })).toHaveAttribute(
      'aria-checked',
      'false'
    )
  })

  it('marks the table option as checked when value is "table"', () => {
    render(<ViewToggle value="table" onChange={vi.fn()} />)

    expect(screen.getByRole('radio', { name: /table view/i })).toHaveAttribute(
      'aria-checked',
      'true'
    )
  })

  it('invokes onChange with the new value when a button is clicked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<ViewToggle value="card" onChange={onChange} />)

    await user.click(screen.getByRole('radio', { name: /table view/i }))
    expect(onChange).toHaveBeenCalledWith('table')
  })

  it('does not invoke onChange when clicking the already-selected option', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<ViewToggle value="card" onChange={onChange} />)

    await user.click(screen.getByRole('radio', { name: /card view/i }))
    expect(onChange).not.toHaveBeenCalled()
  })
})
