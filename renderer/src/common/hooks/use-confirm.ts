import { useContext } from 'react'
import {
  ConfirmContext,
  type ConfirmContextType,
} from '@/common/contexts/confirm'

export function useConfirm() {
  const context = useContext(
    ConfirmContext as React.Context<ConfirmContextType | null>
  )
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context.confirm
}

export function useConfirmQuit() {
  const confirm = useConfirm()
  return async () => {
    return confirm(
      'Shutting down ToolHive will also shut down all your MCP servers.',
      {
        title: 'Confirm Quit',
        isDestructive: true,
        buttons: { yes: 'Quit', no: 'Cancel' },
      }
    )
  }
}
