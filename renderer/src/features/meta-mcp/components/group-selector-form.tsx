import { useTransition, type ReactElement } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { RadioGroup, RadioGroupItem } from '@/common/components/ui/radio-group'
import { Label } from '@/common/components/ui/label'
import { Button } from '@/common/components/ui/button'
import type { GroupWithServers } from '@/features/meta-mcp/hooks/use-mcp-optimizer-groups'
import {
  useMetaMcpConfig,
  getMetaMcpOptimizedGroup,
} from '@/features/meta-mcp/hooks/use-meta-mcp-config'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'
import { useUpdateServer } from '@/features/mcp-servers/hooks/use-update-server'
import {
  ALLOWED_GROUPS_ENV_VAR,
  META_MCP_SERVER_NAME,
} from '@/common/lib/constants'
import log from 'electron-log/renderer'
import type { FormSchemaLocalMcp } from '@/features/mcp-servers/lib/form-schema-local-mcp'
import { getApiV1BetaWorkloadsByNameQueryKey } from '@common/api/generated/@tanstack/react-query.gen'
import { queryClient } from '@/common/lib/query-client'
import { toast } from 'sonner'
import { useMcpOptimizerClients } from '../hooks/use-mcp-optimizer-clients'
import { LoadingStateDialog } from './loading-state-dialog'
import { useCreateOptimizerWorkload } from '@/features/meta-mcp/hooks/use-create-optimizer-workload'
import { trackEvent } from '@/common/lib/analytics'

interface GroupSelectorFormProps {
  groups: GroupWithServers[]
}

const formSchema = z.object({
  selectedGroup: z.string().optional(),
})

type FormSchema = z.infer<typeof formSchema>

export function GroupSelectorForm({
  groups,
}: GroupSelectorFormProps): ReactElement {
  const { data: metaMcpConfig, isError: isMetaMcpConfigError } =
    useMetaMcpConfig()
  const [isPending, startTransition] = useTransition()
  const defaultSelectedGroup = getMetaMcpOptimizedGroup(
    isMetaMcpConfigError ? undefined : metaMcpConfig
  )
  const { saveGroupClients } = useMcpOptimizerClients()
  const { handleCreateMetaOptimizerWorkload } = useCreateOptimizerWorkload()
  const { updateServerMutation } = useUpdateServer(META_MCP_SERVER_NAME, {
    onSecretError: (error, variables) => {
      log.error('onSecretError during update', error, variables)
    },
  })
  const form = useForm<FormSchema>({
    resolver: zodV4Resolver(formSchema),
    values: {
      selectedGroup: defaultSelectedGroup ?? '',
    },
  })

  const isDirty = form.formState.isDirty
  const isSelectedGroup = useWatch({
    control: form.control,
    name: 'selectedGroup',
  })

  const onSubmit = async (data: FormSchema) => {
    const optimized_workloads = groups.flatMap((g) => g.servers)
    startTransition(async () => {
      try {
        if (metaMcpConfig && !isMetaMcpConfigError) {
          const previousGroupName =
            metaMcpConfig?.env_vars?.[ALLOWED_GROUPS_ENV_VAR]
          const envVars = [
            ...Object.entries(metaMcpConfig?.env_vars ?? {})
              .filter(([name]) => name !== ALLOWED_GROUPS_ENV_VAR)
              .map(([name, value]) => ({ name, value })),
            { name: ALLOWED_GROUPS_ENV_VAR, value: data.selectedGroup },
          ]

          await updateServerMutation(
            {
              data: {
                ...metaMcpConfig,
                type: 'docker_image',
                envVars,
              } as FormSchemaLocalMcp,
            },
            {
              onSuccess: async () => {
                queryClient.invalidateQueries({
                  queryKey: getApiV1BetaWorkloadsByNameQueryKey({
                    path: { name: META_MCP_SERVER_NAME },
                  }),
                })

                const optimizedGroupName =
                  envVars.find((item) => item.name === ALLOWED_GROUPS_ENV_VAR)
                    ?.value ?? ''
                trackEvent(`MCP Optimizer workload updated allowed groups`, {
                  workload: META_MCP_SERVER_NAME,
                  is_editing: 'true',
                  optimized_group_name: optimizedGroupName,
                  'custom.optimized_workloads': optimized_workloads.join(','),
                  is_mcp_optimizer: 'true',
                  is_optimizer_group: 'true',
                  optimized_workloads_length: optimized_workloads.length,
                })

                if (data.selectedGroup) {
                  await saveGroupClients({
                    groupName: data.selectedGroup,
                    previousGroupName,
                  })
                  toast.success(
                    `MCP Optimizer applied to ${data.selectedGroup} group`
                  )
                }
              },
              onError: (error) => {
                toast.error('Error updating MCP Optimizer')
                log.error(`Error updating ${META_MCP_SERVER_NAME}`, error)
              },
            }
          )
        } else {
          await handleCreateMetaOptimizerWorkload({
            groupToOptimize: data.selectedGroup ?? '',
            optimized_workloads,
          })
        }
      } catch (error) {
        log.error(`Error submitting form for ${META_MCP_SERVER_NAME}`, error)
      }
    })
  }

  return (
    <>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Controller
          name="selectedGroup"
          control={form.control}
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              className="gap-0"
              disabled={isPending}
            >
              <div className="bg-card rounded-md border">
                {groups.map((group) => {
                  const groupName = group.name ?? ''
                  const servers = group.servers
                  const serverCount = servers.length

                  return (
                    <Label
                      key={groupName}
                      htmlFor={groupName}
                      className="hover:bg-accent flex cursor-pointer items-start
                        gap-3 border-b p-4 last:border-b-0"
                    >
                      <RadioGroupItem
                        id={groupName}
                        value={groupName}
                        className="mt-0.5"
                      />
                      <div className="flex flex-1 flex-col gap-1">
                        <span className="text-sm font-medium">{groupName}</span>
                        <p className="text-muted-foreground text-xs">
                          {serverCount === 0
                            ? 'No servers'
                            : servers.join(', ')}
                        </p>
                      </div>
                    </Label>
                  )
                })}
              </div>
            </RadioGroup>
          )}
        />
        <div className="mt-6 flex justify-end">
          <Button
            type="submit"
            variant="action"
            disabled={isPending || !isSelectedGroup || !isDirty}
          >
            Set Optimized Group
          </Button>
        </div>
      </form>
      <LoadingStateDialog isOpen={isPending} />
    </>
  )
}
