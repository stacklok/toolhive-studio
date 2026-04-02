import { createFileRoute } from '@tanstack/react-router'
import { ChatInterface } from '@/features/chat/components/chat-interface'
import { NotFound } from '@/common/components/not-found'
import { usePermissions } from '@/common/contexts/permissions'
import { PERMISSION_KEYS } from '@/common/contexts/permissions/permission-keys'

export const Route = createFileRoute('/playground')({
  component: Playground,
})

function Playground() {
  const { canShow } = usePermissions()

  if (!canShow(PERMISSION_KEYS.PLAYGROUND_MENU)) {
    return <NotFound />
  }

  return <ChatInterface />
}
