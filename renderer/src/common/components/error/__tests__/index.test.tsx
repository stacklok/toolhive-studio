import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Error as ErrorComponent } from '../index'

describe('Error', () => {
  it('renders <KeyringError /> when error contains "OS keyring is not available"', () => {
    const keyringError = new Error('OS keyring is not available')

    render(<ErrorComponent error={keyringError} />)

    expect(
      screen.getByText('System Keyring Cannot be Reached')
    ).toBeInTheDocument()
    expect(
      screen.getByText(/ToolHive Studio needs to access your system keyring/)
    ).toBeInTheDocument()
  })

  it('renders generic error properly', () => {
    const genericError = new Error('Network connection failed')

    render(<ErrorComponent error={genericError} />)

    expect(screen.getByText('Oops, something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Network connection failed')).toBeInTheDocument()
  })
})
