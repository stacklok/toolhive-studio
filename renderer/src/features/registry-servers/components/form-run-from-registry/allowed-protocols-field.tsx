import { Label } from '@/common/components/ui/label'
import { Checkbox } from '@/common/components/ui/checkbox'

interface AllowedProtocolsFieldProps {
  field: {
    value?: string[]
    onChange: (value: string[]) => void
  }
}

export function AllowedProtocolsField({ field }: AllowedProtocolsFieldProps) {
  return (
    <div className="mt-6">
      <Label htmlFor="allowed-protocols-group">Allowed Protocols</Label>
      <div
        id="allowed-protocols-group"
        role="group"
        aria-label="Allowed Protocols"
      >
        <div className="mt-2 flex items-center gap-4">
          <label className="flex items-center gap-2">
            <Checkbox
              aria-label="TCP"
              checked={field.value?.includes('TCP') || false}
              onCheckedChange={(checked) => {
                if (checked) {
                  field.onChange([...(field.value || []), 'TCP'])
                } else {
                  field.onChange(
                    field.value?.filter((v: string) => v !== 'TCP') || []
                  )
                }
              }}
            />
            TCP
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              aria-label="UDP"
              checked={field.value?.includes('UDP') || false}
              onCheckedChange={(checked) => {
                if (checked) {
                  field.onChange([...(field.value || []), 'UDP'])
                } else {
                  field.onChange(
                    field.value?.filter((v: string) => v !== 'UDP') || []
                  )
                }
              }}
            />
            UDP
          </label>
        </div>
      </div>
    </div>
  )
}
