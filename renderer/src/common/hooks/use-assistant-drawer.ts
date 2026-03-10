import { createContext, useContext } from 'react'

export interface AssistantDrawerContextValue {
  isOpen: boolean
  toggle: () => void
  close: () => void
}

export const AssistantDrawerContext =
  createContext<AssistantDrawerContextValue | null>(null)

export function useAssistantDrawer(): AssistantDrawerContextValue {
  const ctx = useContext(AssistantDrawerContext)
  if (!ctx)
    throw new Error(
      'useAssistantDrawer must be used within AssistantDrawerProvider'
    )
  return ctx
}
