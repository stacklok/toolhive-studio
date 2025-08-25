import { createContext, type ReactNode } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { z } from 'zod/v4'

// Legacy PromptConfig for backward compatibility with simple input prompts
export type PromptConfig = {
  title?: ReactNode
  description?: ReactNode
  placeholder?: string
  defaultValue?: string
  inputType?: 'text' | 'password' | 'email' | 'url'
  validation?: {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    customValidator?: (value: string) => string | null // Returns error message or null
  }
  buttons?: {
    confirm: ReactNode
    cancel: ReactNode
  }
}

// New FormPromptConfig for react-hook-form based prompts
export type FormPromptConfig<TSchema extends z.ZodType> = {
  title?: ReactNode
  description?: ReactNode
  schema: TSchema
  defaultValues: z.infer<TSchema>
  renderForm: (form: UseFormReturn<z.infer<TSchema>>) => ReactNode
  buttons?: {
    confirm: ReactNode
    cancel: ReactNode
  }
}

type LegacyPromptFunction = (
  message: ReactNode,
  config?: PromptConfig
) => Promise<string | null> // Returns the input value or null if cancelled

type FormPromptFunction = <TSchema extends z.ZodType>(
  config: FormPromptConfig<TSchema>
) => Promise<z.infer<TSchema> | null> // Returns the form values or null if cancelled

export type PromptContextType = {
  prompt: LegacyPromptFunction
  promptForm: FormPromptFunction
}

export const PromptContext = createContext<PromptContextType | null>(null)
