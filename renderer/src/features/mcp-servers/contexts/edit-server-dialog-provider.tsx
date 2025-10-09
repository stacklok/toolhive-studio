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
  })

  const openDialog = (
    serverName: string,
    isRemote: boolean,
    groupName: string
  ) => {
    setState({
      isOpen: true,
      serverName,
      isRemote,
      groupName,
    })
  }

  const closeDialog = () => {
    setState({
      isOpen: false,
      serverName: null,
      isRemote: false,
      groupName: null,
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
