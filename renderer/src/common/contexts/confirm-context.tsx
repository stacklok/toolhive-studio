import { createContext, useContext, useState, ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/common/components/ui/dialog'
import { Button } from '@/common/components/ui/button'

export type Buttons = {
  yes: ReactNode
  no: ReactNode
}

export type ConfirmConfig = {
  buttons: Buttons
  title?: ReactNode
  isDestructive?: boolean
  description?: ReactNode
}

export type ConfirmFunction = (
  message: ReactNode,
  config: ConfirmConfig
) => Promise<boolean>

export type ConfirmContextType = {
  confirm: ConfirmFunction
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context.confirm
}

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
    setTimeout(() => setActiveQuestion(null), 200) // Clean up after close
  }

  const confirm: ConfirmFunction = (message, config) => {
    return new Promise<boolean>((resolve) => {
      setActiveQuestion({ message, config, resolve })
      setIsOpen(true)
    })
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            {activeQuestion?.config.title && (
              <DialogTitle>{activeQuestion.config.title}</DialogTitle>
            )}
            {activeQuestion?.config.description && (
              <DialogDescription>{activeQuestion.config.description}</DialogDescription>
            )}
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
              variant={activeQuestion?.config.isDestructive ? 'destructive' : 'default'}
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

export { ConfirmContext } 