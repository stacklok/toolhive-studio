import { useState, type ReactNode } from 'react'
import type { z } from 'zod/v4'
import { PromptContext, type FormPromptConfig } from '.'
import { FormPromptDialog } from './form-prompt-dialog'

export function PromptProvider({ children }: { children: ReactNode }) {
  // Form prompt state
  const [activeFormPrompt, setActiveFormPrompt] = useState<{
    config: FormPromptConfig<z.ZodType>
    resolve: (value: unknown) => void
  } | null>(null)

  const [isFormOpen, setIsFormOpen] = useState(false)

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
      setActiveFormPrompt({ config, resolve })
      setIsFormOpen(true)
    })
  }

  const handleFormOpenChange = (open: boolean) => {
    if (!open) {
      handleFormCancel()
    }
  }

  return (
    <PromptContext.Provider value={{ promptForm }}>
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
    </PromptContext.Provider>
  )
}
