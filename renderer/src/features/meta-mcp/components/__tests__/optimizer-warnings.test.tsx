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

  it('renders the unoptimized access warning', () => {
    render(<OptimizerWarnings />)

    expect(screen.getByText('Unoptimized Access Detected')).toBeInTheDocument()
    expect(screen.getAllByText(/claude/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/foobar/i).length).toBeGreaterThan(0)
  })

  it('renders both alert components', () => {
    const { container } = render(<OptimizerWarnings />)

    // Should have 2 Alert components
    const alerts = container.querySelectorAll('[role="alert"]')
    expect(alerts).toHaveLength(2)
  })
})
