import { createContext, useContext, useState } from 'react'

interface AssistantDrawerContextValue {
  isOpen: boolean
  toggle: () => void
  close: () => void
}

const AssistantDrawerContext =
  createContext<AssistantDrawerContextValue | null>(null)

export function AssistantDrawerProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <AssistantDrawerContext.Provider
      value={{
        isOpen,
        toggle: () => setIsOpen((v) => !v),
        close: () => setIsOpen(false),
      }}
    >
      {children}
    </AssistantDrawerContext.Provider>
  )
}

export function useAssistantDrawer() {
  const ctx = useContext(AssistantDrawerContext)
  if (!ctx)
    throw new Error(
      'useAssistantDrawer must be used within AssistantDrawerProvider'
    )
  return ctx
}
