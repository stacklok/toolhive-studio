import { createContext, type ReactNode } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { z } from 'zod/v4'

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

type PromptFunction = <TSchema extends z.ZodType>(
  config: FormPromptConfig<TSchema>
) => Promise<z.infer<TSchema> | null> // Returns the form values or null if cancelled

export type PromptContextType = {
  promptForm: PromptFunction
}

export const PromptContext = createContext<PromptContextType | null>(null)
