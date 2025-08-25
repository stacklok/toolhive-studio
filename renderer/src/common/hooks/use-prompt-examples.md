# usePrompt and usePromptForm Examples

This document demonstrates how to use both the legacy `usePrompt` hook for simple input prompts and the new `usePromptForm` hook for complex form-based prompts.

## Legacy usePrompt (Simple Input Prompts)

The legacy `usePrompt` hook is perfect for simple single-field input prompts with basic validation.

```typescript
import { usePrompt } from '@/common/hooks/use-prompt'

function SimplePromptExample() {
  const prompt = usePrompt()

  const handleCreateItem = async () => {
    const itemName = await prompt('Item Name', {
      title: 'Create New Item',
      description: 'Enter a name for your new item',
      placeholder: 'Enter item name...',
      defaultValue: '',
      inputType: 'text',
      validation: {
        required: true,
        minLength: 3,
        maxLength: 50,
        pattern: /^[a-zA-Z0-9\s]+$/,
        customValidator: (value) => {
          if (value.includes('forbidden')) {
            return 'This word is not allowed'
          }
          return null
        }
      },
      buttons: {
        confirm: 'Create',
        cancel: 'Cancel'
      }
    })

    if (itemName) {
      console.log('Creating item:', itemName)
      // Handle creation logic here
    }
  }

  return <button onClick={handleCreateItem}>Create Item</button>
}
```

## New usePromptForm (Complex Form Prompts)

The new `usePromptForm` hook is designed for complex forms with multiple fields, advanced validation using Zod schemas, and custom rendering.

### Basic Example

```typescript
import { usePromptForm } from '@/common/hooks/use-prompt'
import { z } from 'zod/v4'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/common/components/ui/form'
import { Input } from '@/common/components/ui/input'

// Define the validation schema
const userSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  email: z.string().email('Please enter a valid email address'),
  age: z.number().min(18, 'Must be at least 18').max(120, 'Age must be realistic')
})

type UserFormData = z.infer<typeof userSchema>

function FormPromptExample() {
  const promptForm = usePromptForm()

  const handleCreateUser = async () => {
    const result = await promptForm({
      title: 'Create User Account',
      description: 'Please fill in the user details below',
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
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter full name..."
                    {...field}
                    autoFocus
                  />
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
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter email address..."
                    {...field}
                  />
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
                    placeholder="Enter age..."
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
        confirm: 'Create User',
        cancel: 'Cancel'
      }
    })

    if (result) {
      console.log('Creating user:', result)
      // result is fully typed: { name: string, email: string, age: number }
    }
  }

  return <button onClick={handleCreateUser}>Create User</button>
}
```

### Advanced Example with Complex Validation

```typescript
import { usePromptForm } from '@/common/hooks/use-prompt'
import { z } from 'zod/v4'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/common/components/ui/form'
import { Input } from '@/common/components/ui/input'
import { Textarea } from '@/common/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/common/components/ui/select'

// Advanced schema with custom validation
const projectSchema = z.object({
  name: z.string()
    .min(3, 'Project name must be at least 3 characters')
    .max(50, 'Project name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s-_]+$/, 'Only letters, numbers, spaces, hyphens, and underscores allowed'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters'),
  priority: z.enum(['low', 'medium', 'high'], {
    required_error: 'Please select a priority'
  }),
  budget: z.number()
    .min(0, 'Budget cannot be negative')
    .max(1000000, 'Budget cannot exceed $1,000,000'),
  tags: z.string()
    .transform(str => str.split(',').map(tag => tag.trim()).filter(Boolean))
    .refine(tags => tags.length <= 5, 'Maximum 5 tags allowed')
})

type ProjectFormData = z.infer<typeof projectSchema>

function AdvancedFormExample() {
  const promptForm = usePromptForm()

  const handleCreateProject = async () => {
    const result = await promptForm({
      title: 'Create New Project',
      description: 'Set up your project with the details below',
      schema: projectSchema,
      defaultValues: {
        name: '',
        description: '',
        priority: 'medium' as const,
        budget: 0,
        tags: ''
      },
      renderForm: (form) => (
        <div className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="My Awesome Project"
                    {...field}
                    autoFocus
                  />
                </FormControl>
                <FormDescription>
                  Choose a unique name for your project
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe what this project is about..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="10000"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <Input
                    placeholder="frontend, react, typescript"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Separate tags with commas (max 5 tags)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ),
      buttons: {
        confirm: 'Create Project',
        cancel: 'Cancel'
      }
    })

    if (result) {
      console.log('Creating project:', {
        ...result,
        tags: result.tags // This is now an array of strings thanks to the transform
      })
    }
  }

  return <button onClick={handleCreateProject}>Create Project</button>
}
```

## When to Use Which Hook

### Use `usePrompt` (legacy) when:
- You need a simple single-field input
- Basic validation is sufficient
- You want minimal setup
- The prompt is for quick user input (names, titles, etc.)

### Use `usePromptForm` (new) when:
- You need multiple form fields
- Complex validation is required (email, phone numbers, etc.)
- You want type-safe form data
- You need custom field rendering (selects, checkboxes, etc.)
- Form data has complex relationships or dependencies

## Key Benefits of the New Form-based Approach

1. **Type Safety**: Full TypeScript support with automatic type inference from Zod schemas
2. **Complex Validation**: Leverage the full power of Zod for validation rules
3. **Flexible Rendering**: Complete control over how form fields are rendered
4. **Consistent UI**: Uses the same form components as the rest of the application
5. **Better UX**: Proper error handling, field descriptions, and accessible form controls
6. **Maintainable**: Schemas can be reused and shared across components

## Provider Setup

Both hooks require the `PromptProvider` to be available in your component tree:

```typescript
import { PromptProvider } from '@/common/contexts/prompt/provider'

function App() {
  return (
    <PromptProvider>
      {/* Your app components */}
    </PromptProvider>
  )
}
```

The provider is backward compatible and supports both legacy and new prompt types simultaneously.