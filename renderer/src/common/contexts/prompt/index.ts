import { createContext, type ReactNode } from 'react'
import type { UseFormReturn, FieldValues, Path } from 'react-hook-form'

export type ReactHookFormPromptConfig<TValues extends FieldValues> = {
  title?: ReactNode
  description?: ReactNode
  defaultValues: TValues
  fields: (form: UseFormReturn<TValues>) => ReactNode
  resolver?: any
  buttons?: {
    confirm: ReactNode
    cancel: ReactNode
  }
}

export type PromptContextType = {
  promptForm: <TValues extends FieldValues>(
    config: ReactHookFormPromptConfig<TValues>
  ) => Promise<TValues | null>
}

export const PromptContext = createContext<PromptContextType | null>(null)
