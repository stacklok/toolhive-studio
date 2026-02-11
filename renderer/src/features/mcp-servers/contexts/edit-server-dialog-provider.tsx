import { useState, type ReactNode } from 'react'
import { EditServerDialogContext } from './edit-server-dialog-context'

export function EditServerDialogProvider({
  children,
}: {
  children: ReactNode
}) {
  const [state, setState] = useState({
    isOpen: false,
    serverName: null as string | null,
    isRemote: false,
    groupName: null as string | null,
    imageOverride: null as string | null,
    envVarsOverride: null as Array<{ name: string; value: string }> | null,
  })

  const openDialog = (
    serverName: string,
    isRemote: boolean,
    groupName: string,
    options?: {
      imageOverride?: string
      envVarsOverride?: Array<{ name: string; value: string }>
    }
  ) => {
    setState({
      isOpen: true,
      serverName,
      isRemote,
      groupName,
      imageOverride: options?.imageOverride ?? null,
      envVarsOverride: options?.envVarsOverride ?? null,
    })
  }

  const closeDialog = () => {
    setState({
      isOpen: false,
      serverName: null,
      isRemote: false,
      groupName: null,
      imageOverride: null,
      envVarsOverride: null,
    })
  }

  return (
    <EditServerDialogContext.Provider
      value={{ state, openDialog, closeDialog }}
    >
      {children}
    </EditServerDialogContext.Provider>
  )
}
