import type { ReactElement } from 'react'
import { useEffect } from 'react'
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
  const defaultSelectedGroup = getMetaMcpOptimizedGroup(metaMcpConfig)

  console.log('[GroupSelectorForm] Render:', {
    metaMcpConfig,
    defaultSelectedGroup,
    allowedGroups: metaMcpConfig?.env_vars?.ALLOWED_GROUPS,
  })

  const form = useForm<FormSchema>({
    resolver: zodV4Resolver(formSchema),
    defaultValues: {
      selectedGroup: '',
    },
  })

  // Reset form when defaultSelectedGroup changes to ensure radio buttons update
  useEffect(() => {
    console.log('[GroupSelectorForm] useEffect: Resetting form to:', {
      selectedGroup: defaultSelectedGroup ?? '',
    })
    form.reset({
      selectedGroup: defaultSelectedGroup ?? '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSelectedGroup])

  const onSubmit = (data: FormSchema) => {
    // TODO: Implement submit logic
    console.log('Form submitted:', data)
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
                  <div
                    key={groupName}
                    className="hover:bg-accent flex cursor-pointer items-start
                      gap-3 border-b p-4 last:border-b-0"
                    onClick={() => field.onChange(groupName)}
                  >
                    <RadioGroupItem
                      id={groupName}
                      value={groupName}
                      className="mt-0.5"
                    />
                    <div className="flex flex-1 flex-col gap-1">
                      <Label
                        htmlFor={groupName}
                        className="cursor-pointer text-sm font-medium"
                      >
                        {groupName}
                      </Label>
                      <p className="text-muted-foreground text-xs">
                        {serverCount === 0 ? 'No servers' : servers.join(', ')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </RadioGroup>
        )}
      />
      <div className="mt-6 flex justify-end">
        <Button type="submit">Apply Changes</Button>
      </div>
    </form>
  )
}
