import { createContext, ReactNode } from 'react'

type Buttons = {
  yes: ReactNode
  no: ReactNode
}

export type ConfirmConfig = {
  buttons: Buttons
  title?: ReactNode
  isDestructive?: boolean
  description?: ReactNode
}

type ConfirmFunction = (
  message: ReactNode,
  config: ConfirmConfig
) => Promise<boolean>

export type ConfirmContextType = {
  confirm: ConfirmFunction
}

export const ConfirmContext = createContext<ConfirmContextType | null>(null)
