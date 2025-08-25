import { useState, type ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/common/components/ui/dialog'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import type { z } from 'zod/v4'
import { PromptContext, type PromptConfig, type FormPromptConfig } from '.'
import { FormPromptDialog } from './form-prompt-dialog'

export function PromptProvider({ children }: { children: ReactNode }) {
  // Legacy prompt state
  const [activeLegacyPrompt, setActiveLegacyPrompt] = useState<{
    message: ReactNode
    config: PromptConfig
    resolve: (value: string | null) => void
  } | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Form prompt state
  const [activeFormPrompt, setActiveFormPrompt] = useState<{
    config: FormPromptConfig<z.ZodType>
    resolve: (value: unknown) => void
  } | null>(null)

  const [isLegacyOpen, setIsLegacyOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const validateInput = (value: string): string | null => {
    if (!activeLegacyPrompt?.config.validation) return null

    const { validation } = activeLegacyPrompt.config

    if (validation.required && !value.trim()) {
      return 'This field is required'
    }

    if (validation.minLength && value.length < validation.minLength) {
      return `Must be at least ${validation.minLength} characters`
    }

    if (validation.maxLength && value.length > validation.maxLength) {
      return `Must be no more than ${validation.maxLength} characters`
    }

    if (validation.pattern && !validation.pattern.test(value)) {
      return 'Invalid format'
    }

    if (validation.customValidator) {
      return validation.customValidator(value)
    }

    return null
  }

  const handleLegacyConfirm = () => {
    if (!activeLegacyPrompt) return

    const validationError = validateInput(inputValue)
    if (validationError) {
      setError(validationError)
      return
    }

    activeLegacyPrompt.resolve(inputValue)
    closeLegacyDialog()
  }

  const handleFormSubmit = (data: unknown) => {
    if (!activeFormPrompt) return
    activeFormPrompt.resolve(data)
    closeFormDialog()
  }

  const handleLegacyCancel = () => {
    if (activeLegacyPrompt) {
      activeLegacyPrompt.resolve(null)
    }
    closeLegacyDialog()
  }

  const handleFormCancel = () => {
    if (activeFormPrompt) {
      activeFormPrompt.resolve(null)
    }
    closeFormDialog()
  }

  const closeLegacyDialog = () => {
    setIsLegacyOpen(false)
    setInputValue('')
    setError(null)
    setActiveLegacyPrompt(null)
  }

  const closeFormDialog = () => {
    setIsFormOpen(false)
    setActiveFormPrompt(null)
  }

  const prompt = (message: ReactNode, config: PromptConfig = {}) => {
    return new Promise<string | null>((resolve) => {
      setActiveLegacyPrompt({ message, config, resolve })
      setInputValue(config.defaultValue || '')
      setError(null)
      setIsLegacyOpen(true)
    })
  }

  const promptForm = <TSchema extends z.ZodType>(
    config: FormPromptConfig<TSchema>
  ) => {
    return new Promise<z.infer<TSchema> | null>((resolve) => {
      setActiveFormPrompt({ config, resolve })
      setIsFormOpen(true)
    })
  }

  const handleLegacyOpenChange = (open: boolean) => {
    if (!open) {
      handleLegacyCancel()
    }
  }

  const handleFormOpenChange = (open: boolean) => {
    if (!open) {
      handleFormCancel()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    // Clear error when user starts typing
    if (error) {
      setError(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleLegacyConfirm()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleLegacyCancel()
    }
  }

  return (
    <PromptContext.Provider value={{ prompt, promptForm }}>
      {children}

      {/* Legacy prompt dialog */}
      <Dialog open={isLegacyOpen} onOpenChange={handleLegacyOpenChange}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {activeLegacyPrompt?.config.title || 'Input Required'}
            </DialogTitle>
            <DialogDescription>
              {activeLegacyPrompt?.config.description || ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              {activeLegacyPrompt?.message && (
                <Label htmlFor="prompt-input" className="text-sm font-medium">
                  {activeLegacyPrompt.message}
                </Label>
              )}
              <Input
                id="prompt-input"
                type={activeLegacyPrompt?.config.inputType || 'text'}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={activeLegacyPrompt?.config.placeholder}
                autoFocus
                className={error ? 'border-destructive' : ''}
              />
              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleLegacyCancel}
              type="button"
            >
              {activeLegacyPrompt?.config.buttons?.cancel ?? 'Cancel'}
            </Button>
            <Button onClick={handleLegacyConfirm} type="button">
              {activeLegacyPrompt?.config.buttons?.confirm ?? 'OK'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
