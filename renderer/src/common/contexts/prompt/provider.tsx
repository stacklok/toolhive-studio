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
import { PromptContext, type PromptConfig } from '.'

export function PromptProvider({ children }: { children: ReactNode }) {
  const [activePrompt, setActivePrompt] = useState<{
    message: ReactNode
    config: PromptConfig
    resolve: (value: string | null) => void
  } | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const validateInput = (value: string): string | null => {
    if (!activePrompt?.config.validation) return null

    const { validation } = activePrompt.config

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

  const handleConfirm = () => {
    if (!activePrompt) return

    const validationError = validateInput(inputValue)
    if (validationError) {
      setError(validationError)
      return
    }

    activePrompt.resolve(inputValue)
    closeDialog()
  }

  const handleCancel = () => {
    if (!activePrompt) return
    activePrompt.resolve(null)
    closeDialog()
  }

  const closeDialog = () => {
    setIsOpen(false)
    setInputValue('')
    setError(null)
    setActivePrompt(null)
  }

  const prompt = (message: ReactNode, config: PromptConfig = {}) => {
    return new Promise<string | null>((resolve) => {
      setActivePrompt({ message, config, resolve })
      setInputValue(config.defaultValue || '')
      setError(null)
      setIsOpen(true)
    })
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleCancel()
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
      handleConfirm()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  return (
    <PromptContext.Provider value={{ prompt }}>
      {children}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {activePrompt?.config.title || 'Input Required'}
            </DialogTitle>
            <DialogDescription>
              {activePrompt?.config.description || ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              {activePrompt?.message && (
                <Label htmlFor="prompt-input" className="text-sm font-medium">
                  {activePrompt.message}
                </Label>
              )}
              <Input
                id="prompt-input"
                type={activePrompt?.config.inputType || 'text'}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={activePrompt?.config.placeholder}
                autoFocus
                className={error ? 'border-destructive' : ''}
              />
              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} type="button">
              {activePrompt?.config.buttons?.cancel ?? 'Cancel'}
            </Button>
            <Button onClick={handleConfirm} type="button">
              {activePrompt?.config.buttons?.confirm ?? 'OK'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PromptContext.Provider>
  )
}
