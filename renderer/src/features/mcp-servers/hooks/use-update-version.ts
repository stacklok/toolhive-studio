import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaWorkloadsByNameOptions } from '@common/api/generated/@tanstack/react-query.gen'
import type { V1CreateRequest } from '@common/api/generated/types.gen'
import { useConfirm } from '@/common/hooks/use-confirm'
import { useMutationUpdateWorkload } from './use-mutation-update-workload'

interface UseUpdateVersionOptions {
  serverName: string
  registryImage: string
  localTag: string
  registryTag: string
}

function toUpdateBody(
  workloadData: V1CreateRequest,
  registryImage: string
): Omit<V1CreateRequest, 'name'> & { image: string } {
  const config: Partial<V1CreateRequest> = { ...workloadData }
  delete config.name
  return { ...config, image: registryImage }
}

export function useUpdateVersion({
  serverName,
  registryImage,
  localTag,
  registryTag,
}: UseUpdateVersionOptions) {
  const confirm = useConfirm()
  const updateWorkload = useMutationUpdateWorkload()
  const { data: workloadData } = useQuery({
    ...getApiV1BetaWorkloadsByNameOptions({
      path: { name: serverName },
    }),
    enabled: !!serverName,
  })

  const promptUpdate = async () => {
    const result = await confirm(
      `Update "${serverName}" from ${localTag} to ${registryTag}?`,
      {
        title: 'Update to latest version',
        buttons: { yes: 'Update', no: 'Cancel' },
      }
    )

    if (result && workloadData) {
      await updateWorkload({
        path: { name: serverName },
        body: toUpdateBody(workloadData, registryImage),
      })
    }
  }

  return {
    promptUpdate,
    isReady: !!workloadData,
  }
}
