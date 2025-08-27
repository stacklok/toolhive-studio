import { useState, type ReactNode } from 'react'
import { PromptContext, type FormikFormPromptConfig } from '.'
import { FormikFormPromptDialog } from './form-prompt-dialog'

export function PromptProvider({ children }: { children: ReactNode }) {
  // Formik prompt state
  const [activeFormikPrompt, setActiveFormikPrompt] = useState<{
    config: FormikFormPromptConfig<Record<string, unknown>>
    resolve: (value: unknown) => void
  } | null>(null)

  const [isFormikOpen, setIsFormikOpen] = useState(false)

  const promptFormik = <TValues extends object>(
    config: FormikFormPromptConfig<TValues>
  ) => {
    return new Promise<TValues | null>((resolve) => {
      setActiveFormikPrompt({
        // Type erasure to simplify state storage
        config: config as unknown as FormikFormPromptConfig<
          Record<string, unknown>
        >,
        resolve: (value: unknown) => resolve(value as TValues),
      })
      setIsFormikOpen(true)
    })
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
    <PromptContext.Provider value={{ promptFormik }}>
      {children}

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
