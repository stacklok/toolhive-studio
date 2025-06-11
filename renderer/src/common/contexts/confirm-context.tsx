import { useState, ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/common/components/ui/dialog'
import { Button } from '@/common/components/ui/button'
import { ConfirmContext, ConfirmConfig } from './confirm-context-ctx'

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [activeQuestion, setActiveQuestion] = useState<{
    message: ReactNode
    config: ConfirmConfig
    resolve: (value: boolean) => void
  } | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const handleAnswer = (answer: boolean) => {
    if (!activeQuestion) return
    activeQuestion.resolve(answer)
    setIsOpen(false)
  }

  const confirm = (message: ReactNode, config: ConfirmConfig) => {
    return new Promise<boolean>((resolve) => {
      setActiveQuestion({ message, config, resolve })
      setIsOpen(true)
    })
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setActiveQuestion(null)
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
