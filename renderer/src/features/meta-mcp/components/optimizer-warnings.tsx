import type { ReactElement } from 'react'
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/common/components/ui/alert'
import { AlertTriangle, InfoIcon } from 'lucide-react'
import type { GroupWithServers } from '../hooks/use-mcp-optimizer-groups'
import { MCP_OPTIMIZER_GROUP_NAME } from '@/common/lib/constants'

export function OptimizerWarnings({
  groups,
}: {
  groups: GroupWithServers[]
}): ReactElement {
  const optimizerGroup = groups.find(
    (group) => group.name === MCP_OPTIMIZER_GROUP_NAME
  )
  return (
    <>
      <Alert className="mb-6">
        <AlertTriangle />
        <AlertTitle>Experimental Feature</AlertTitle>
        <AlertDescription>
          This is an experimental feature currently under development.
        </AlertDescription>
      </Alert>
      {!optimizerGroup?.registered_clients?.length && (
        <Alert className="mb-6">
          <InfoIcon className="size-4" />
          <AlertTitle>No clients registered</AlertTitle>
          <AlertDescription>
            We recommend registering clients in the MCP Optimizer group.
          </AlertDescription>
        </Alert>
      )}
    </>
  )
}
