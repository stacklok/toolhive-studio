import { MoreVertical } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from '@/common/components/ui/dropdown-menu'
import { ServerUrl } from './items/server-url'
import { EditConfigurationMenuItem } from './items/edit-configuration-menu-item'
import { GithubRepositoryMenuItem } from './items/github-repository-menu-item'
import { LogsMenuItem } from './items/logs-menu-item'
import { CustomizeToolsMenuItem } from './items/customize-tools-menu-item'
import { RemoveServerMenuItem } from './items/remove-server-menu-item'
import { AddServerToGroupMenuItem } from './items/add-server-to-group-menu-item'

interface ServerActionsDropdownProps {
  name: string
  url: string
  status: string | undefined
  repositoryUrl?: string
  isEditWorkloadEnabled: boolean
  isCustomizeToolsEnabled: boolean
  isGroupsEnabled: boolean
  isDeleting: boolean
}

export function ServerActionsDropdown({
  name,
  url,
  status,
  repositoryUrl,
  isEditWorkloadEnabled,
  isCustomizeToolsEnabled,
  isGroupsEnabled,
  isDeleting,
}: ServerActionsDropdownProps) {
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
        {isEditWorkloadEnabled && (
          <EditConfigurationMenuItem serverName={name} />
        )}
        {repositoryUrl && (
          <GithubRepositoryMenuItem repositoryUrl={repositoryUrl} />
        )}
        <LogsMenuItem serverName={name} />
        {isCustomizeToolsEnabled && (
          <CustomizeToolsMenuItem serverName={name} status={status} />
        )}
        <RemoveServerMenuItem serverName={name} />
        {isGroupsEnabled && <DropdownMenuSeparator />}

        <AddServerToGroupMenuItem serverName={name} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
