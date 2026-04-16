import { createFileRoute, Outlet } from '@tanstack/react-router'
import { NotFound } from '@/common/components/not-found'
import { usePermissions } from '@/common/contexts/permissions'
import { PERMISSION_KEYS } from '@/common/contexts/permissions/permission-keys'

export const Route = createFileRoute('/playground')({
  component: PlaygroundLayout,
})

function PlaygroundLayout() {
  const { canShow } = usePermissions()

  if (!canShow(PERMISSION_KEYS.PLAYGROUND_MENU)) {
    return <NotFound />
  }

  return <Outlet />
}
