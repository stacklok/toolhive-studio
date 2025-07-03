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
import { Checkbox } from '@/common/components/ui/checkbox'
import { ConfirmContext, type ConfirmConfig } from '.'

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [activeQuestion, setActiveQuestion] = useState<{
    message: ReactNode
    config: ConfirmConfig
    resolve: (value: boolean) => void
  } | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [doNotShowAgainChecked, setDoNotShowAgainChecked] = useState(false)

  const handleAnswer = (answer: boolean) => {
    if (!activeQuestion) return

    // Save to localStorage if checkbox is checked and user clicked "Yes"
    if (
      doNotShowAgainChecked &&
      answer &&
      activeQuestion.config.doNotShowAgain
    ) {
      const key = `doNotShowAgain_${activeQuestion.config.doNotShowAgain.id}`
      localStorage.setItem(key, 'true')
    }

    activeQuestion.resolve(answer)
    setIsOpen(false)
    setDoNotShowAgainChecked(false) // Reset for next use
  }

  const confirm = (message: ReactNode, config: ConfirmConfig) => {
    return new Promise<boolean>((resolve) => {
      // Check if user has previously chosen "do not show again"
      if (config.doNotShowAgain) {
        const key = `doNotShowAgain_${config.doNotShowAgain.id}`
        const savedChoice = localStorage.getItem(key)
        if (savedChoice === 'true') {
          // Skip dialog and return true immediately
          resolve(true)
          return
        }
      }

      setActiveQuestion({ message, config, resolve })
      setIsOpen(true)
    })
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setActiveQuestion(null)
      setDoNotShowAgainChecked(false) // Reset checkbox when dialog closes
    }
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            {activeQuestion?.config.title && (
              <DialogTitle>{activeQuestion.config.title}</DialogTitle>
            )}
            <DialogDescription>
              {activeQuestion?.config.description || ''}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">{activeQuestion?.message}</div>
          {activeQuestion?.config.doNotShowAgain && (
            <div className="py-2">
              <label className="flex cursor-pointer items-center space-x-2">
                <Checkbox
                  checked={doNotShowAgainChecked}
                  onCheckedChange={(checked) => {
                    setDoNotShowAgainChecked(checked === true)
                  }}
                />
                <span className="text-sm">
                  {activeQuestion.config.doNotShowAgain.label}
                </span>
              </label>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleAnswer(false)}
              type="button"
            >
              {activeQuestion?.config.buttons.no ?? 'No'}
            </Button>
            <Button
              variant={
                activeQuestion?.config.isDestructive ? 'destructive' : 'default'
              }
              onClick={() => handleAnswer(true)}
              type="button"
            >
              {activeQuestion?.config.buttons.yes ?? 'Yes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}
