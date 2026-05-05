import { createContext, type ReactNode } from 'react'

export type DialogRender<T> = (api: {
  resolve: (value: T) => void
  dismiss: () => void
}) => ReactNode

export type DialogContextType = {
  showDialog: <T>(render: DialogRender<T>) => Promise<T | null>
}

export const DialogContext = createContext<DialogContextType | null>(null)
