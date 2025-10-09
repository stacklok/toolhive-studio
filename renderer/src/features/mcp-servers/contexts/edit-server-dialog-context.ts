import { createContext } from 'react'

interface EditServerDialogState {
  isOpen: boolean
  serverName: string | null
  isRemote: boolean
  groupName: string | null
}

interface EditServerDialogContextValue {
  state: EditServerDialogState
  openDialog: (serverName: string, isRemote: boolean, groupName: string) => void
  closeDialog: () => void
}

export const EditServerDialogContext = createContext<
  EditServerDialogContextValue | undefined
>(undefined)
