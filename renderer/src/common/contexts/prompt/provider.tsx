import { useState, type ReactNode } from 'react'
import { PromptContext, type ReactHookFormPromptConfig } from '.'
import { ReactHookFormPromptDialog } from './form-prompt-dialog'

export function PromptProvider({ children }: { children: ReactNode }) {
  const [activePrompt, setActivePrompt] = useState<{
    config: ReactHookFormPromptConfig<any>
    resolve: (value: unknown) => void
  } | null>(null)

  const [isOpen, setIsOpen] = useState(false)

  const promptForm = <TValues extends Record<string, unknown>>(
    config: ReactHookFormPromptConfig<TValues>
  ) => {
    console.log('promptForm called with config:', config)
    return new Promise<TValues | null>((resolve) => {
      console.log('Creating promise for promptForm')
      setActivePrompt({
        config: config as ReactHookFormPromptConfig<any>,
        resolve: (value: unknown) => {
          console.log('Resolving promise with value:', value)
          resolve(value as TValues)
        },
      })
      setIsOpen(true)
      console.log('Set activePrompt and isOpen to true')
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
    <PromptContext.Provider value={{ promptForm }}>
      {children}

      {activePrompt && (
        <ReactHookFormPromptDialog
          isOpen={isOpen}
          config={activePrompt.config}
          onSubmit={handleSubmit as (v: any) => void}
          onCancel={handleCancel}
          onOpenChange={handleOpenChange}
        />
      )}
    </PromptContext.Provider>
  )
}
