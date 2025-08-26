import { useState, type ReactNode } from 'react'
import type { z } from 'zod/v4'
import { PromptContext, type FormPromptConfig, type FormikFormPromptConfig } from '.'
import { FormPromptDialog, FormikFormPromptDialog } from './form-prompt-dialog'

export function PromptProvider({ children }: { children: ReactNode }) {
  // Form prompt state
  const [activeFormPrompt, setActiveFormPrompt] = useState<{
    config: FormPromptConfig<z.ZodType>
    resolve: (value: unknown) => void
  } | null>(null)

  const [isFormOpen, setIsFormOpen] = useState(false)

  // Formik prompt state
  const [activeFormikPrompt, setActiveFormikPrompt] = useState<{
    config: FormikFormPromptConfig<Record<string, unknown>>
    resolve: (value: unknown) => void
  } | null>(null)

  const [isFormikOpen, setIsFormikOpen] = useState(false)

  const handleFormSubmit = (data: unknown) => {
    if (!activeFormPrompt) return
    activeFormPrompt.resolve(data)
    closeFormDialog()
  }

  const handleFormCancel = () => {
    if (activeFormPrompt) {
      activeFormPrompt.resolve(null)
    }
    closeFormDialog()
  }

  const closeFormDialog = () => {
    setIsFormOpen(false)
    setActiveFormPrompt(null)
  }

  const promptForm = <TSchema extends z.ZodType>(
    config: FormPromptConfig<TSchema>
  ) => {
    return new Promise<z.infer<TSchema> | null>((resolve) => {
      setActiveFormPrompt({ config, resolve: (value: unknown) => resolve(value as any) })
      setIsFormOpen(true)
    })
  }

  const promptFormik = <TValues extends object>(
    config: FormikFormPromptConfig<TValues>
  ) => {
    return new Promise<TValues | null>((resolve) => {
      setActiveFormikPrompt({
        // Type erasure to simplify state storage
        config: config as unknown as FormikFormPromptConfig<Record<string, unknown>>,
        resolve: (value: unknown) => resolve(value as any),
      })
      setIsFormikOpen(true)
    })
  }

  const handleFormOpenChange = (open: boolean) => {
    if (!open) {
      handleFormCancel()
    }
  }

  const handleFormikSubmit = (data: unknown) => {
    if (!activeFormikPrompt) return
    activeFormikPrompt.resolve(data)
    closeFormikDialog()
  }

  const handleFormikCancel = () => {
    if (activeFormikPrompt) {
      activeFormikPrompt.resolve(null)
    }
    closeFormikDialog()
  }

  const closeFormikDialog = () => {
    setIsFormikOpen(false)
    setActiveFormikPrompt(null)
  }

  const handleFormikOpenChange = (open: boolean) => {
    if (!open) {
      handleFormikCancel()
    }
  }

  return (
    <PromptContext.Provider value={{ promptForm, promptFormik }}>
      {children}

      {/* Form prompt dialog */}
      {activeFormPrompt && (
        <FormPromptDialog
          isOpen={isFormOpen}
          config={activeFormPrompt.config}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          onOpenChange={handleFormOpenChange}
        />
      )}

      {/* Formik form prompt dialog */}
      {activeFormikPrompt && (
        <FormikFormPromptDialog
          isOpen={isFormikOpen}
          config={activeFormikPrompt.config}
          onSubmit={handleFormikSubmit as (v: Record<string, unknown>) => void}
          onCancel={handleFormikCancel}
          onOpenChange={handleFormikOpenChange}
        />
      )}
    </PromptContext.Provider>
  )
}
