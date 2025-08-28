import React, { useContext } from 'react'
import { PromptContext, type PromptContextType } from '@/common/contexts/prompt'
import { Input } from '@/common/components/ui/input'
import type { FormikFormPromptConfig } from '@/common/contexts/prompt'
import type { FormikProps } from 'formik'

export function usePrompt() {
  const context = useContext(
    PromptContext as React.Context<PromptContextType | null>
  )
  if (!context) {
    throw new Error('usePrompt must be used within a PromptProvider')
  }
  return context.promptFormik
}

/**
 * A factory function that generates simple propmt forms using formik.
 * The generated form can be easily displayed using usePrompt()
 */
export function generateSimplePrompt({
  inputType = 'text',
  initialValue = '',
  title,
  description,
  placeholder,
  label,
}: {
  inputType?: 'text' | 'email' | 'password' | 'url'
  initialValue?: string
  title?: string
  description?: string
  placeholder?: string
  label?: string
} = {}): FormikFormPromptConfig<{ value: string }> {
  return {
    title: title || 'Input Required',
    description: description || 'Please provide the requested information.',
    initialValues: { value: initialValue },
    fields: (formik: FormikProps<{ value: string }>) => (
      <div className="space-y-4">
        <div>
          <label htmlFor="value" className="mb-2 block text-sm font-medium">
            {label || 'Value'}
          </label>
          <Input
            id="value"
            type={inputType}
            placeholder={placeholder}
            {...formik.getFieldProps('value')}
          />
          {formik.touched.value && formik.errors.value && (
            <p className="mt-1 text-sm text-red-500">{formik.errors.value}</p>
          )}
        </div>
      </div>
    ),
    buttons: {
      confirm: 'OK',
      cancel: 'Cancel',
    },
  }
}
