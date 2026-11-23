import { useContext } from 'react'
import { ChatSearchContext } from '../lib/chat-search-context'

export function useChatSearch() {
  return useContext(ChatSearchContext)
}
