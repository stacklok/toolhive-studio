import { useContext } from 'react'
import { ConfirmContextType } from './confirm-context'
import { createContext } from 'react'

// Import the actual ConfirmContext from confirm-context.tsx
import { ConfirmContext } from './confirm-context'

export function useConfirm() {
  const context = useContext(ConfirmContext as React.Context<ConfirmContextType | null>)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context.confirm
} 