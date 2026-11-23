import { createContext } from 'react'

export type ChatSearchOpenSource = 'button' | 'shortcut'

export interface ChatSearchContextValue {
  isOpen: boolean
  setOpen: (open: boolean) => void
  openSearch: (source: ChatSearchOpenSource) => void
}

// Default is a no-op so components (e.g. the sidebar) render outside the
// provider in isolation and in tests.
export const ChatSearchContext = createContext<ChatSearchContextValue>({
  isOpen: false,
  setOpen: () => {},
  openSearch: () => {},
})
