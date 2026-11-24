import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { trackEvent } from '@/common/lib/analytics'
import {
  ChatSearchContext,
  type ChatSearchOpenSource,
} from '../lib/chat-search-context'

/**
 * Owns the playground "Search chats" modal state and the ⌘K / Ctrl+K
 * shortcut. Mounted by the `/playground` layout route, so the shortcut is
 * only active on playground pages.
 */
export function ChatSearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false)

  const openSearch = useCallback((source: ChatSearchOpenSource) => {
    setOpen(true)
    trackEvent('Playground: open search', { 'search.source': source })
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (isOpen) setOpen(false)
        else openSearch('shortcut')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, openSearch])

  const value = useMemo(
    () => ({ isOpen, setOpen, openSearch }),
    [isOpen, openSearch]
  )
  return (
    <ChatSearchContext.Provider value={value}>
      {children}
    </ChatSearchContext.Provider>
  )
}
