import { createContext } from 'react'

interface EditServerDialogState {
  isOpen: boolean
  serverName: string | null
  isRemote: boolean
  groupName: string | null
  imageOverride: string | null
  envVarsOverride: Array<{ name: string; value: string }> | null
}

interface EditServerDialogContextValue {
  state: EditServerDialogState
  openDialog: (
    serverName: string,
    isRemote: boolean,
    groupName: string,
    options?: {
      imageOverride?: string
      envVarsOverride?: Array<{ name: string; value: string }>
    }
  ) => void
  closeDialog: () => void
}

export const EditServerDialogContext = createContext<
  EditServerDialogContextValue | undefined
>(undefined)
