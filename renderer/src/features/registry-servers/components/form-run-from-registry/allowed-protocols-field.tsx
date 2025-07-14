import { Label } from '@/common/components/ui/label'
import React from 'react'

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
          <label>
            <input
              type="checkbox"
              aria-label="TCP"
              checked={field.value?.includes('TCP') || false}
              onChange={() => {
                if (field.value?.includes('TCP')) {
                  field.onChange(field.value.filter((v: string) => v !== 'TCP'))
                } else {
                  field.onChange([...(field.value || []), 'TCP'])
                }
              }}
            />{' '}
            TCP
          </label>
          <label>
            <input
              type="checkbox"
              aria-label="UDP"
              checked={field.value?.includes('UDP') || false}
              onChange={() => {
                if (field.value?.includes('UDP')) {
                  field.onChange(field.value.filter((v: string) => v !== 'UDP'))
                } else {
                  field.onChange([...(field.value || []), 'UDP'])
                }
              }}
            />{' '}
            UDP
          </label>
        </div>
      </div>
    </div>
  )
}
