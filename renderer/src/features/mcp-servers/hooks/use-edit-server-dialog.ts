import { useContext } from 'react'
import { EditServerDialogContext } from '../contexts/edit-server-dialog-context'

export function useEditServerDialog() {
  const context = useContext(EditServerDialogContext)
  if (context === undefined) {
    throw new Error(
      'useEditServerDialog must be used within an EditServerDialogProvider'
    )
  }
  return context
}
