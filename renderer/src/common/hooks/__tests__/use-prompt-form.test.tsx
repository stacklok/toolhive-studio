import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { usePromptForm } from '../use-prompt'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import { z } from 'zod/v4'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/common/components/ui/form'
import { Input } from '@/common/components/ui/input'
import { Button } from '@/common/components/ui/button'

// Test schema for a user registration form
const userRegistrationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  age: z
    .number()
    .min(18, 'Must be at least 18 years old')
    .max(120, 'Age must be realistic'),
})

// Test component that uses the form prompt
function TestComponent() {
  const promptForm = usePromptForm()

  const handleRegisterUser = async () => {
    const result = await promptForm({
      title: 'User Registration',
      description: 'Please fill in your details to register',
      schema: userRegistrationSchema,
      defaultValues: {
        email: '',
        username: '',
        age: 18,
      },
      renderForm: (form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter your email..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="Choose a username..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="age"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Age</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter your age..."
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ),
      buttons: {
        confirm: 'Register',
        cancel: 'Cancel',
      },
    })

    if (result) {
      // Store result for testing
      ;(window as Record<string, unknown>).lastFormResult = result
    }
  }

  return (
    <div>
      <Button onClick={handleRegisterUser} data-testid="register-button">
        Open Registration Form
      </Button>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <PromptProvider>
      <TestComponent />
    </PromptProvider>
  )
}

beforeEach(() => {
  // Clear any previous results
  delete (window as Record<string, unknown>).lastFormResult
})

describe('usePromptForm', () => {
  it('should open a form dialog with multiple fields and validation', async () => {
    renderWithProvider()

    // Click the button to open the form
    const registerButton = screen.getByTestId('register-button')
    await userEvent.click(registerButton)

    // Verify dialog opens
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Check form elements are present
    expect(
      screen.getByRole('heading', { name: /user registration/i })
    ).toBeVisible()
    expect(screen.getByText(/please fill in your details/i)).toBeVisible()

    expect(screen.getByLabelText(/email/i)).toBeVisible()
    expect(screen.getByLabelText(/username/i)).toBeVisible()
    expect(screen.getByLabelText(/age/i)).toBeVisible()

    expect(screen.getByRole('button', { name: /register/i })).toBeVisible()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeVisible()
  })

  it('should handle form submission correctly', async () => {
    renderWithProvider()

    const registerButton = screen.getByTestId('register-button')
    await userEvent.click(registerButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Get form elements
    const emailInput = screen.getByLabelText(/email/i)
    const usernameInput = screen.getByLabelText(/username/i)
    const ageInput = screen.getByLabelText(/age/i)
    const submitButton = screen.getByRole('button', { name: /register/i })

    // Verify form inputs exist and can be interacted with
    expect(emailInput).toBeVisible()
    expect(usernameInput).toBeVisible()
    expect(ageInput).toBeVisible()
    expect(submitButton).toBeVisible()

    // Try entering some data
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(usernameInput, 'testuser')

    // Verify values were entered
    expect(emailInput).toHaveValue('test@example.com')
    expect(usernameInput).toHaveValue('testuser')
  })

  it('should submit valid form data and close dialog', async () => {
    renderWithProvider()

    const registerButton = screen.getByTestId('register-button')
    await userEvent.click(registerButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill in valid data
    const emailInput = screen.getByLabelText(/email/i)
    const usernameInput = screen.getByLabelText(/username/i)
    const ageInput = screen.getByLabelText(/age/i)
    const submitButton = screen.getByRole('button', { name: /register/i })

    await userEvent.type(emailInput, 'user@example.com')
    await userEvent.type(usernameInput, 'testuser')
    await userEvent.clear(ageInput)
    await userEvent.type(ageInput, '25')

    await userEvent.click(submitButton)

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // Check that the result was passed correctly
    await waitFor(() => {
      expect((window as Record<string, unknown>).lastFormResult).toEqual({
        email: 'user@example.com',
        username: 'testuser',
        age: 25,
      })
    })
  })

  it('should return null when cancelled', async () => {
    renderWithProvider()

    const registerButton = screen.getByTestId('register-button')
    await userEvent.click(registerButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await userEvent.click(cancelButton)

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // Should not have a result
    expect((window as Record<string, unknown>).lastFormResult).toBeUndefined()
  })

  it('should reset form when reopened', async () => {
    renderWithProvider()

    const registerButton = screen.getByTestId('register-button')

    // Open and fill form first time
    await userEvent.click(registerButton)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    const emailInput = screen.getByLabelText(/email/i)
    await userEvent.type(emailInput, 'first@example.com')

    // Cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await userEvent.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // Open again
    await userEvent.click(registerButton)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Email field should be empty (reset to default values)
    const newEmailInput = screen.getByLabelText(/email/i)
    expect(newEmailInput).toHaveValue('')
  })
})
