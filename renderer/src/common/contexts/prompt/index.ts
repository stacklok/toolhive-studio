import { createContext, type ReactNode } from 'react'

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

type PromptFunction = (
  message: ReactNode,
  config?: PromptConfig
) => Promise<string | null> // Returns the input value or null if cancelled

export type PromptContextType = {
  prompt: PromptFunction
}

export const PromptContext = createContext<PromptContextType | null>(null)
