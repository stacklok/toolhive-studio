# usePrompt Hook Examples

This file demonstrates how to use the `usePrompt` hook with the `generatePromptProps` factory function for simple prompts, and the direct form-based approach for complex forms.

## Factory Function for Simple Prompts

The `generatePromptProps` factory function makes it easy to create simple text input prompts with validation.

### Basic Usage

```tsx
import { usePrompt, generatePromptProps } from '@/common/hooks/use-prompt'

function MyComponent() {
  const prompt = usePrompt()

  const handleGetUserName = async () => {
    const result = await prompt(
      generatePromptProps('text', '', {
        title: 'Enter Name',
        label: 'Name',
        placeholder: 'Type your name here...',
        required: true,
        minLength: 2,
        maxLength: 50,
        confirmText: 'Save',
        cancelText: 'Cancel'
      })
    )

    if (result) {
      console.log('User entered:', result.value) // result.value is a string
    } else {
      console.log('User cancelled')
    }
  }

  return <button onClick={handleGetUserName}>Get Name</button>
}
```

### Input Types and Validation

```tsx
// Text input with pattern validation
const result = await prompt(
  generatePromptProps('text', '', {
    title: 'Numbers Only',
    label: 'Phone Number',
    pattern: /^\d+$/,
    placeholder: '1234567890'
  })
)

// Email input with built-in validation
const emailResult = await prompt(
  generatePromptProps('email', '', {
    title: 'Contact Information',
    label: 'Email Address',
    placeholder: 'user@example.com'
  })
)

// URL input
const urlResult = await prompt(
  generatePromptProps('url', '', {
    title: 'Website',
    label: 'URL',
    placeholder: 'https://example.com'
  })
)

// Password input
const passwordResult = await prompt(
  generatePromptProps('password', '', {
    title: 'Security',
    label: 'Password',
    required: true,
    minLength: 8
  })
)
```

### Available Options

```tsx
generatePromptProps(
  inputType: 'text' | 'email' | 'password' | 'url',
  initialValue: string,
  options: {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    title?: ReactNode
    description?: ReactNode
    placeholder?: string
    label?: ReactNode
    confirmText?: ReactNode
    cancelText?: ReactNode
  }
)
```

## Direct Form-Based Approach for Complex Forms

For more complex forms, use the direct form-based approach with custom schemas and rendering.

### Multi-Field Form Example

```tsx
import { usePrompt } from '@/common/hooks/use-prompt'
import { z } from 'zod/v4'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/common/components/ui/form'
import { Input } from '@/common/components/ui/input'

const userSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  email: z.string().email('Invalid email address'),
  age: z.number().min(18, 'Must be 18 or older')
})

function MyComponent() {
  const prompt = usePrompt()

  const handleGetUserInfo = async () => {
    const result = await prompt({
      title: 'User Information',
      description: 'Please fill in your details',
      schema: userSchema,
      defaultValues: {
        name: '',
        email: '',
        age: 18
      },
      renderForm: (form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your name..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Enter your email..." {...field} />
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
        confirm: 'Save',
        cancel: 'Cancel'
      }
    })

    if (result) {
      console.log('User data:', result) // result is { name: string, email: string, age: number }
    } else {
      console.log('User cancelled')
    }
  }

  return <button onClick={handleGetUserInfo}>Get User Info</button>
}
```

## When to Use Which Approach

### Use `generatePromptProps` for:
- Simple single-field prompts
- Text, email, password, or URL inputs
- Basic validation requirements
- Quick input gathering

### Use Direct Form-Based Approach for:
- Multi-field forms
- Complex validation requirements
- Custom form layouts
- Rich input components (selects, checkboxes, etc.)
- Type-safe form data with custom schemas

## Real-World Example: Group Creation

This is how the "Add a group" feature uses the factory function:

```tsx
const handleAddGroup = async () => {
  const result = await prompt(
    generatePromptProps('text', '', {
      title: 'Create a group',
      label: 'Name',
      placeholder: 'Enter group name...',
      required: true,
      minLength: 1,
      maxLength: 50,
      confirmText: 'Create',
      cancelText: 'Cancel',
    })
  )

  if (result) {
    createGroupMutation.mutate({
      body: {
        name: result.value, // Access the value through result.value
      },
    })
  }
}
```