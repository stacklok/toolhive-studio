import { useContext } from 'react'
import {
  ConfirmContext,
  type ConfirmContextType,
} from '@/common/contexts/confirm/context'

export function useConfirm() {
  const context = useContext(
    ConfirmContext as React.Context<ConfirmContextType | null>
  )
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context.confirm
}
