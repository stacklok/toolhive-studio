import type { ReactElement } from 'react'
import { useState } from 'react'
import { RadioGroup, RadioGroupItem } from '@/common/components/ui/radio-group'
import { Label } from '@/common/components/ui/label'
import { Button } from '@/common/components/ui/button'

interface Group {
  name?: string
}

interface GroupSelectorFormProps {
  groups: Group[]
  serversByGroup: Record<string, string[]>
}

export function GroupSelectorForm({
  groups,
  serversByGroup,
}: GroupSelectorFormProps): ReactElement {
  const [selectedGroup, setSelectedGroup] = useState<string>('')

  return (
    <>
      <RadioGroup
        value={selectedGroup}
        onValueChange={setSelectedGroup}
        className="gap-0"
      >
        <div className="rounded-xl border">
          {groups.map((group) => {
            const groupName = group.name ?? ''
            const servers = serversByGroup[groupName] ?? []
            const serverCount = servers.length

            return (
              <div
                key={groupName}
                className="hover:bg-accent flex cursor-pointer items-start gap-3
                  border-b p-4 last:border-b-0"
                onClick={() => setSelectedGroup(groupName)}
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
      <div className="mt-6 flex justify-end">
        <Button>Apply Changes</Button>
      </div>
    </>
  )
}
