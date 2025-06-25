import {
  postApiV1BetaWorkloadsMutation,
  getApiV1BetaWorkloadsByNameOptions,
  postApiV1BetaSecretsDefaultKeysMutation,
} from '@/common/api/generated/@tanstack/react-query.gen'
import { pollServerStatus } from '@/common/lib/polling'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useCallback } from 'react'
import type { FormSchemaRunMcpCommand } from '../lib/form-schema-run-mcp-server-with-command'
import { orchestrateRunCustomServer } from '../lib/orchestrate-run-custom-server'

export function useRunCustomServer() {
  const queryClient = useQueryClient()

  const { mutateAsync: saveSecret } = useMutation({
    ...postApiV1BetaSecretsDefaultKeysMutation(),
  })
  const { mutateAsync: createWorkload } = useMutation({
    ...postApiV1BetaWorkloadsMutation(),
  })

  const getIsServerReady: (serverName: string) => Promise<boolean> =
    useCallback(
      (serverName: string) =>
        pollServerStatus(
          () =>
            queryClient.fetchQuery(
              getApiV1BetaWorkloadsByNameOptions({
                path: { name: serverName },
              })
            ),
          'running'
        ),
      [queryClient]
    )

  const handleSubmit = useCallback(
    async (data: FormSchemaRunMcpCommand) =>
      orchestrateRunCustomServer({
        data,
        saveSecret,
        createWorkload,
        queryClient,
        getIsServerReady,
      }),
    [createWorkload, getIsServerReady, queryClient, saveSecret]
  )

  return {
    handleSubmit,
  }
}
