import { createContext, type ReactNode } from 'react'
import type { UseFormReturn, FieldValues, Resolver } from 'react-hook-form'

export type ReactHookFormPromptConfig<TValues extends FieldValues> = {
  title?: string
  description?: ReactNode
  defaultValues: TValues
  resolver?: Resolver<TValues>
  fields: (form: UseFormReturn<TValues>) => ReactNode
  buttons?: {
    confirm?: string
    cancel?: string
  }
}

export type PromptContextType = {
  promptForm: <TValues extends Record<string, unknown>>(
    config: ReactHookFormPromptConfig<TValues>
  ) => Promise<TValues | null>
}

export const PromptContext = createContext<PromptContextType | null>(null)
