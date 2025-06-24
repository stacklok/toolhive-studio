import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, beforeEach, it, expect } from 'vitest'
import { DialogFormSecret } from '../dialog-form-secret'

const mockOnSubmit = vi.fn()
const mockOnOpenChange = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

it('should call onSubmit creating a new secret', async () => {
  render(
    <DialogFormSecret
      isOpen
      onOpenChange={mockOnOpenChange}
      onSubmit={mockOnSubmit}
    />
  )

  await userEvent.type(screen.getByPlaceholderText('Name'), 'TEST_SECRET')
  await userEvent.type(screen.getByPlaceholderText('Secret'), 'test-value')
  await userEvent.click(screen.getByRole('button', { name: /save/i }))

  await waitFor(() => {
    expect(mockOnSubmit).toHaveBeenCalledWith({
      key: 'TEST_SECRET',
      value: 'test-value',
    })
  })
})

it('should call onSubmit editing key of an existing secret', async () => {
  render(
    <DialogFormSecret
      isOpen
      secretKey="Github"
      onOpenChange={mockOnOpenChange}
      onSubmit={mockOnSubmit}
    />
  )

  await userEvent.type(screen.getByPlaceholderText('Secret'), 'updated-value')
  await userEvent.click(screen.getByRole('button', { name: /update/i }))
  await waitFor(() => {
    expect(mockOnSubmit).toHaveBeenCalledWith({
      key: 'Github',
      value: 'updated-value',
    })
  })
})

it('should not call onSubmit when form has validation errors', async () => {
  render(
    <DialogFormSecret
      isOpen
      onOpenChange={mockOnOpenChange}
      onSubmit={mockOnSubmit}
    />
  )

  await userEvent.click(screen.getByRole('button', { name: /save/i }))

  await waitFor(() => {
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  expect(screen.getByText('Secret name is required')).toBeInTheDocument()
  expect(screen.getByText('Secret contents is required')).toBeInTheDocument()
})
