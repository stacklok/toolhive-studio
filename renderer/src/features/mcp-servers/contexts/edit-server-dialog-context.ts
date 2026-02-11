import { createContext } from 'react'

export interface SecretOverride {
  name: string
  value: { secret: string; isFromStore: boolean }
}

interface EditServerDialogState {
  isOpen: boolean
  serverName: string | null
  isRemote: boolean
  groupName: string | null
  imageOverride: string | null
  envVarsOverride: Array<{ name: string; value: string }> | null
  secretsOverride: SecretOverride[] | null
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
      secretsOverride?: SecretOverride[]
    }
  ) => void
  closeDialog: () => void
}

export const EditServerDialogContext = createContext<
  EditServerDialogContextValue | undefined
>(undefined)
