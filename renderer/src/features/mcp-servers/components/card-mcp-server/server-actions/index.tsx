import { MoreVertical } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from '@/common/components/ui/dropdown-menu'
import type {
  RegistryImageMetadata,
  RegistryRemoteServerMetadata,
} from '@common/api/generated/types.gen'
import { ServerUrl } from './items/server-url'
import { EditConfigurationMenuItem } from './items/edit-configuration-menu-item'
import { GithubRepositoryMenuItem } from './items/github-repository-menu-item'
import { LogsMenuItem } from './items/logs-menu-item'
import { CustomizeToolsMenuItem } from './items/customize-tools-menu-item'
import { RemoveServerMenuItem } from './items/remove-server-menu-item'
import { UpdateVersionMenuItem } from './items/update-version-menu-item'
import { AddServerToGroupMenuItem } from './items/add-server-to-group-menu-item'
import { ComplianceCheckMenuItem } from './items/compliance-check-menu-item'

interface ServerActionsDropdownProps {
  name: string
  url: string
  status: string | undefined
  remote: boolean
  group?: string
  isFromRegistry: boolean
  drift: { localTag: string; registryTag: string } | null
  matchedRegistryItem:
    | RegistryImageMetadata
    | RegistryRemoteServerMetadata
    | undefined
  onRecheck?: () => void
  isCheckingCompliance?: boolean
}

export function ServerActionsDropdown({
  name,
  url,
  status,
  remote,
  group,
  isFromRegistry,
  drift,
  matchedRegistryItem,
  onRecheck,
  isCheckingCompliance,
}: ServerActionsDropdownProps) {
  const repositoryUrl = matchedRegistryItem?.repository_url
  const isDeleting = status === 'deleting' || status === 'removing'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="More options"
          className="ml-2"
          onClick={(e) => e.stopPropagation()}
          disabled={isDeleting}
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        collisionPadding={10}
        align="end"
        role="menu"
        className="w-80"
      >
        <ServerUrl url={url} />
        <DropdownMenuSeparator />
        <EditConfigurationMenuItem serverName={name} />
        {isFromRegistry &&
          drift &&
          matchedRegistryItem &&
          'image' in matchedRegistryItem &&
          matchedRegistryItem.image && (
            <UpdateVersionMenuItem
              serverName={name}
              registryImage={matchedRegistryItem.image}
              localTag={drift.localTag}
              registryTag={drift.registryTag}
              registryEnvVars={matchedRegistryItem.env_vars}
              disabled={isDeleting || status === 'updating'}
            />
          )}
        {repositoryUrl && (
          <GithubRepositoryMenuItem repositoryUrl={repositoryUrl} />
        )}
        <LogsMenuItem serverName={name} remote={remote} group={group} />
        <CustomizeToolsMenuItem serverName={name} status={status} />
        {onRecheck && (
          <ComplianceCheckMenuItem
            onRecheck={onRecheck}
            disabled={status !== 'running' || !!isCheckingCompliance}
          />
        )}
        <RemoveServerMenuItem serverName={name} group={group} />
        <DropdownMenuSeparator />
        <AddServerToGroupMenuItem serverName={name} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
