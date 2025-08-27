import { createContext, type ReactNode } from 'react'
import type { FormikConfig, FormikProps } from 'formik'

export type FormikFormPromptConfig<TValues extends object> = {
  title?: ReactNode
  description?: ReactNode
  initialValues: TValues
  fields: (formik: FormikProps<TValues>) => ReactNode
  /** Optional Formik validate function */
  validate?: FormikConfig<TValues>['validate']
  /** Optional Formik/Yup validation schema. Left as unknown to avoid hard dependency on Yup types */
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
