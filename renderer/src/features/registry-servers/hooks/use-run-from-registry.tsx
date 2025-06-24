import { type RegistryImageMetadata } from '@/common/api/generated'
import {
  postApiV1BetaWorkloadsMutation,
  getApiV1BetaWorkloadsByNameOptions,
  postApiV1BetaSecretsDefaultKeysMutation,
} from '@/common/api/generated/@tanstack/react-query.gen'
import { pollServerStatus } from '@/common/lib/polling'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FormSchemaRunFromRegistry } from '../lib/get-form-schema-run-from-registry'
import { useCallback } from 'react'
import { orchestrateRunRegistryServer } from '../lib/orchestrate-run-registry-server'

export function useRunFromRegistry() {
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
        pollServerStatus(() =>
          queryClient.fetchQuery(
            getApiV1BetaWorkloadsByNameOptions({
              path: { name: serverName },
            })
          )
        ),
      [queryClient]
    )

  const handleSubmit = useCallback(
    async (server: RegistryImageMetadata, data: FormSchemaRunFromRegistry) =>
      orchestrateRunRegistryServer({
        server,
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
