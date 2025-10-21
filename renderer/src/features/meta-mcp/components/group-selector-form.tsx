import { useState, type ReactElement } from 'react'
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const defaultSelectedGroup = getMetaMcpOptimizedGroup(metaMcpConfig)
  const { updateServerMutation } = useUpdateServer(META_MCP_SERVER_NAME || '', {
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

  const onSubmit = async (data: FormSchema) => {
    if (!metaMcpConfig) return
    setIsSubmitting(true)

    const envVars = [
      ...Object.entries(metaMcpConfig.env_vars ?? {})
        .filter(([name]) => name !== ALLOWED_GROUPS_ENV_VAR)
        .map(([name, value]) => ({ name, value })),
      { name: ALLOWED_GROUPS_ENV_VAR, value: data.selectedGroup ?? '' },
    ]

    const toastId = toast.loading(
      `Setting up Meta Optimizer for ${data.selectedGroup}...`
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
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getApiV1BetaWorkloadsByNameQueryKey({
              path: { name: META_MCP_SERVER_NAME },
            }),
          })

          toast.success(`Meta Optimizer for ${data.selectedGroup} is available`)
        },
        onSettled: () => {
          setIsSubmitting(false)
          toast.dismiss(toastId)
        },
        onError: (error) => {
          log.error(`Error updating ${META_MCP_SERVER_NAME}`, error)
        },
      }
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Controller
        name="selectedGroup"
        control={form.control}
        render={({ field }) => (
          <RadioGroup
            value={field.value}
            onValueChange={field.onChange}
            className="gap-0"
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
                        {serverCount === 0 ? 'No servers' : servers.join(', ')}
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
        <Button type="submit" disabled={isSubmitting}>
          Apply Changes
        </Button>
      </div>
    </form>
  )
}
