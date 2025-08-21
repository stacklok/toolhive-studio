import type { ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaGroups } from '@api/sdk.gen'
import { Group } from './group'
import { Link, useRouterState } from '@tanstack/react-router'

type UiGroup = {
  id: string
  name: string
  isEnabled: boolean
}

export function GroupsManager(): ReactElement {
  const router = useRouterState({ select: (s) => s.location.search })
  const { data } = useQuery({
    queryKey: ['api', 'v1beta', 'groups'],
    queryFn: async () => {
      const response = await getApiV1BetaGroups({
        parseAs: 'text',
        responseStyle: 'data',
      })
      const parsed =
        typeof response === 'string' ? JSON.parse(response) : response
      return parsed as {
        groups?: Array<{ name?: string; registered_clients?: string[] }>
      }
    },
    staleTime: 5_000,
  })

  const apiGroups = data?.groups ?? []

  const uiGroups: UiGroup[] = apiGroups.map((g, index) => ({
    id: `group-${index + 1}`,
    name: g.name ?? `Group ${index + 1}`,
    isEnabled: Boolean(g.registered_clients && g.registered_clients.length > 0),
  }))

  const currentGroupName = (router as Record<string, unknown>)['group']
    ? String((router as Record<string, string>)['group']).toLowerCase()
    : 'default'

  return (
    <div className="space-y-2">
      {uiGroups.map((group) => (
        <Link
          key={group.id}
          to="/"
          search={(prev) => ({
            ...prev,
            group: (group.name ?? 'default').toLowerCase(),
          })}
          preload={false}
        >
          <Group
            name={group.name}
            isEnabled={group.isEnabled}
            isActive={(group.name ?? '').toLowerCase() === currentGroupName}
          />
        </Link>
      ))}
    </div>
  )
}
