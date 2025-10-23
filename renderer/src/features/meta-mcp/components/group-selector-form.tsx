import { useTransition, type ReactElement } from 'react'
import { useForm, Controller } from 'react-hook-form'
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
import { getApiV1BetaWorkloadsByNameQueryKey } from '@api/@tanstack/react-query.gen'
import { queryClient } from '@/common/lib/query-client'
import { toast } from 'sonner'
import { useMcpOptimizerClients } from '../hooks/use-mcp-optimizer-clients'
import { LoadingStateDialog } from './loading-state-dialog'
import { useCreateOptimizerWorkload } from '@/common/hooks/use-create-optimizer-workload'
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
  const { data: metaMcpConfig } = useMetaMcpConfig()
  const [isPending, startTransition] = useTransition()
  const defaultSelectedGroup = getMetaMcpOptimizedGroup(metaMcpConfig)
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
  const isSelectedGroup = form.watch('selectedGroup')

  const onSubmit = async (data: FormSchema) => {
    startTransition(async () => {
      try {
        if (metaMcpConfig) {
          const envVars = [
            ...Object.entries(metaMcpConfig?.env_vars ?? {})
              .filter(([name]) => name !== ALLOWED_GROUPS_ENV_VAR)
              .map(([name, value]) => ({ name, value })),
            { name: ALLOWED_GROUPS_ENV_VAR, value: data.selectedGroup },
          ]

          const toastId = toast.loading(
            `Setting up Meta Optimizer for ${data.selectedGroup} group...`
          )
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

                if (data.selectedGroup) {
                  await saveGroupClients(data.selectedGroup)
                  toast.success(
                    `Meta Optimizer for ${data.selectedGroup} is available`
                  )
                }
              },
              onSettled: () => {
                toast.dismiss(toastId)
              },
              onError: (error) => {
                toast.error('Error updating MCP Optimizer')
                log.error(`Error updating ${META_MCP_SERVER_NAME}`, error)
              },
            }
          )
        } else {
          await handleCreateMetaOptimizerWorkload(data.selectedGroup ?? '')
        }
      } catch (error) {
        log.error(`Error submitting form for ${META_MCP_SERVER_NAME}`, error)
        const errorMessage =
          error instanceof Error
            ? error.message
            : `Error submitting form for ${META_MCP_SERVER_NAME}`
        toast.error(errorMessage)
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
              <div className="rounded-xl border">
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
          <Button type="submit" disabled={isPending || !isSelectedGroup}>
            Apply Changes
          </Button>
        </div>
      </form>
      <LoadingStateDialog isOpen={isPending} />
    </>
  )
}
