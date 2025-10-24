import {
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/common/components/ui/alert'
import { AlertTriangle, InfoIcon } from 'lucide-react'
import { MCP_OPTIMIZER_GROUP_NAME } from '@/common/lib/constants'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaGroupsOptions } from '@api/@tanstack/react-query.gen'

export function OptimizerWarnings() {
  const { data: groupsData } = useQuery({
    ...getApiV1BetaGroupsOptions({}),
  })
  const optimizerGroup = groupsData?.groups?.find(
    (g) => g.name === MCP_OPTIMIZER_GROUP_NAME
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
            We recommend registering clients in the selected optimized group.
          </AlertDescription>
        </Alert>
      )}
    </>
  )
}
