import { useState, type ReactNode } from 'react'
import { PromptContext, type FormikFormPromptConfig } from '.'
import { FormikFormPromptDialog } from './form-prompt-dialog'

export function PromptProvider({ children }: { children: ReactNode }) {
  const [activePrompt, setActivePrompt] = useState<{
    config: FormikFormPromptConfig<Record<string, unknown>>
    resolve: (value: unknown) => void
  } | null>(null)

  const [isOpen, setIsOpen] = useState(false)

  const promptFormik = <TValues extends object>(
    config: FormikFormPromptConfig<TValues>
  ) => {
    return new Promise<TValues | null>((resolve) => {
      setActivePrompt({
        config: config as unknown as FormikFormPromptConfig<
          Record<string, unknown>
        >,
        resolve: (value: unknown) => resolve(value as TValues),
      })
      setIsOpen(true)
    })
  }

  const handleSubmit = (data: unknown) => {
    if (!activePrompt) return
    activePrompt.resolve(data)
    closeDialog()
  }

  const handleCancel = () => {
    if (activePrompt) {
      activePrompt.resolve(null)
    }
    closeDialog()
  }

  const closeDialog = () => {
    setIsOpen(false)
    setActivePrompt(null)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleCancel()
    }
  }

  return (
    <PromptContext.Provider value={{ promptFormik }}>
      {children}

      {activePrompt && (
        <FormikFormPromptDialog
          isOpen={isOpen}
          config={activePrompt.config}
          onSubmit={handleSubmit as (v: Record<string, unknown>) => void}
          onCancel={handleCancel}
          onOpenChange={handleOpenChange}
        />
      )}
    </PromptContext.Provider>
  )
}
