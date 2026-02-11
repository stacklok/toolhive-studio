import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaWorkloadsByNameOptions } from '@common/api/generated/@tanstack/react-query.gen'
import type {
  RegistryEnvVar,
  V1CreateRequest,
} from '@common/api/generated/types.gen'
import { useConfirm } from '@/common/hooks/use-confirm'
import { useCheckServerStatus } from '@/common/hooks/use-check-server-status'
import { useEditServerDialog } from './use-edit-server-dialog'
import { useMutationUpdateWorkload } from './use-mutation-update-workload'
import { DriftDetails } from '../components/drift-details'
import { getEnvVarsDrift } from '../lib/get-env-vars-drift'
import { toast } from 'sonner'

interface UseUpdateVersionOptions {
  serverName: string
  registryImage: string
  localTag: string
  registryTag: string
  registryEnvVars?: RegistryEnvVar[]
}

export function toUpdateBody(
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
  registryEnvVars,
}: UseUpdateVersionOptions) {
  const confirm = useConfirm()
  const updateWorkload = useMutationUpdateWorkload()
  const { checkServerStatus } = useCheckServerStatus()
  const { openDialog } = useEditServerDialog()
  const { data: workloadData } = useQuery({
    ...getApiV1BetaWorkloadsByNameOptions({
      path: { name: serverName },
    }),
    enabled: !!serverName,
  })

  const performUpdate = async () => {
    if (!workloadData) return
    try {
      await updateWorkload({
        path: { name: serverName },
        body: toUpdateBody(workloadData, registryImage),
      })
      checkServerStatus({
        serverName,
        groupName: workloadData.group || 'default',
        isEditing: true,
      })
    } catch {
      toast.error(`Failed to update "${serverName}"`)
    }
  }

  const promptUpdate = async () => {
    if (!workloadData) return

    const drift = getEnvVarsDrift(registryEnvVars, workloadData)

    if (!drift) {
      // No env var drift — simple confirm dialog
      const confirmed = await confirm(
        <div className="space-y-3">
          <p className="text-sm">
            Update <span className="font-medium">"{serverName}"</span> from{' '}
            <code className="bg-muted rounded px-1 py-0.5 text-xs">
              {localTag}
            </code>{' '}
            to{' '}
            <code className="bg-muted rounded px-1 py-0.5 text-xs">
              {registryTag}
            </code>
            ?
          </p>
          <p className="text-muted-foreground text-xs">
            No configuration changes detected between versions.
          </p>
        </div>,
        {
          title: 'Update to latest version',
          buttons: { yes: 'Update', no: 'Cancel' },
        }
      )
      if (!confirmed) return
      await performUpdate()
      return
    }

    // Drift detected — show detailed dialog with edit option
    const confirmed = await confirm(
      <div className="space-y-3">
        <p className="text-sm">
          Update <span className="font-medium">"{serverName}"</span> from{' '}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">
            {localTag}
          </code>{' '}
          to{' '}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">
            {registryTag}
          </code>
          ?
        </p>
        <DriftDetails drift={drift} />
      </div>,
      {
        title: 'Update to latest version',
        buttons: { yes: 'Edit and review', no: 'Cancel' },
      }
    )

    if (!confirmed) return

    openDialog(serverName, false, workloadData.group || 'default', {
      imageOverride: registryImage,
      envVarsOverride: drift.added
        .filter((v) => !v.secret)
        .map((v) => ({ name: v.name, value: '' })),
      secretsOverride: drift.added
        .filter((v) => v.secret)
        .map((v) => ({
          name: v.name,
          value: { secret: '', isFromStore: false },
        })),
    })
  }

  return {
    promptUpdate,
    isReady: !!workloadData,
  }
}
