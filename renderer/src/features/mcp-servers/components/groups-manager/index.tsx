import type { ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaGroupsOptions } from '@api/@tanstack/react-query.gen'
import { Group } from './group'

type UiGroup = {
  id: string
  name: string
  isEnabled: boolean
}

export function GroupsManager(): ReactElement {
  const { data } = useQuery({ ...getApiV1BetaGroupsOptions() })
  const apiGroups = data?.groups ?? []

  const uiGroups: UiGroup[] = apiGroups.map((g, index) => ({
    id: `group-${index + 1}`,
    name: g.name ?? `Group ${index + 1}`,
    isEnabled: Boolean(g.registered_clients && g.registered_clients.length > 0),
  }))

  const DEFAULT_GROUP_NAME = 'Default group'
  const activeGroupId =
    uiGroups.find((g) => g.name === DEFAULT_GROUP_NAME)?.id || uiGroups[0]?.id

  return (
    <div className="space-y-2">
      {uiGroups.map((group) => (
        <Group
          key={group.id}
          name={group.name}
          isEnabled={group.isEnabled}
          isActive={group.id === activeGroupId}
        />
      ))}
    </div>
  )
}
