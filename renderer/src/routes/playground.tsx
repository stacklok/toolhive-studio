import { createFileRoute, Outlet } from '@tanstack/react-router'
import { NotFound } from '@/common/components/not-found'
import { usePermissions } from '@/common/contexts/permissions'
import { PERMISSION_KEYS } from '@/common/contexts/permissions/permission-keys'
import { ChatSearchProvider } from '@/features/chat/components/chat-search-provider'
import { SearchChatsDialog } from '@/features/chat/components/search-chats-dialog'

export const Route = createFileRoute('/playground')({
  component: PlaygroundLayout,
})

function PlaygroundLayout() {
  const { canShow } = usePermissions()

  if (!canShow(PERMISSION_KEYS.PLAYGROUND_MENU)) {
    return <NotFound />
  }

  return (
    <ChatSearchProvider>
      <Outlet />
      <SearchChatsDialog />
    </ChatSearchProvider>
  )
}
