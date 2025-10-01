import type { ReactNode } from 'react'

type Buttons = {
  yes: ReactNode
  no: ReactNode
}

export type ConfirmConfig = {
  buttons: Buttons
  title?: ReactNode
  isDestructive?: boolean
  description?: ReactNode
  doNotShowAgain?: {
    label: ReactNode
    id: string
  }
}
