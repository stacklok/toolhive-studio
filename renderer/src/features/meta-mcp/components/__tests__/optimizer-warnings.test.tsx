import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OptimizerWarnings } from '../optimizer-warnings'

describe('OptimizerWarnings', () => {
  it('renders the experimental feature warning', () => {
    render(<OptimizerWarnings />)

    expect(screen.getByText('Experimental Feature')).toBeInTheDocument()
    expect(
      screen.getByText(
        'This is an experimental feature currently under development.'
      )
    ).toBeInTheDocument()
  })

  it('renders the alert component', () => {
    const { container } = render(<OptimizerWarnings />)

    const alerts = container.querySelectorAll('[role="alert"]')
    expect(alerts).toHaveLength(1)
  })
})
