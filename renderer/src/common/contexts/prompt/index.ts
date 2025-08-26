import { createContext, type ReactNode } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { z } from 'zod/v4'
import type { FormikConfig, FormikProps } from 'formik'

export type FormPromptConfig<TSchema extends z.ZodType> = {
  title?: ReactNode
  description?: ReactNode
  schema: TSchema
  defaultValues: z.infer<TSchema>
  renderForm: (form: UseFormReturn) => ReactNode
  buttons?: {
    confirm: ReactNode
    cancel: ReactNode
  }
}

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

type PromptFunction = <TSchema extends z.ZodType>(
  config: FormPromptConfig<TSchema>
) => Promise<z.infer<TSchema> | null> // Returns the form values or null if cancelled

export type PromptContextType = {
  promptForm: PromptFunction
  promptFormik: <TValues extends object>(
    config: FormikFormPromptConfig<TValues>
  ) => Promise<TValues | null>
}

export const PromptContext = createContext<PromptContextType | null>(null)
