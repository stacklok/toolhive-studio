import { createContext, type ReactNode } from 'react'
import type { FormikConfig, FormikProps } from 'formik'

export type FormikFormPromptConfig<TValues extends object> = {
  title?: ReactNode
  description?: ReactNode
  initialValues: TValues
  fields: (formik: FormikProps<TValues>) => ReactNode
  validate?: FormikConfig<TValues>['validate']
  validationSchema?: unknown
  buttons?: {
    confirm: ReactNode
    cancel: ReactNode
  }
}

export type PromptContextType = {
  promptFormik: <TValues extends object>(
    config: FormikFormPromptConfig<TValues>
  ) => Promise<TValues | null>
}

export const PromptContext = createContext<PromptContextType | null>(null)
