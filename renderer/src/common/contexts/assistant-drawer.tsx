import { useState } from 'react'
import { AssistantDrawerContext } from '@/common/hooks/use-assistant-drawer'

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
