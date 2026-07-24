import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { ShieldCheck, ShieldOff } from 'lucide-react'
import { Badge } from '@/common/components/ui/badge'
import {
  NETWORK_ACCESS_MODES,
  type NetworkAccessMode,
} from '@/common/lib/form-schema-mcp'

type NetworkAccessFormValues = FieldValues & {
  networkAccess: NetworkAccessMode
}

export function NetworkAccessTabTriggerLabel<
  TFieldValues extends NetworkAccessFormValues,
>({ form }: { form: UseFormReturn<TFieldValues> }) {
  const networkAccess = form.watch(
    'networkAccess' as Path<TFieldValues>
  ) as NetworkAccessMode
  const isRestricted = networkAccess === NETWORK_ACCESS_MODES.Proxy

  return (
    <>
      Network access
      <Badge
        variant={isRestricted ? 'success' : 'outline'}
        className="pointer-events-none font-normal"
      >
        {isRestricted ? (
          <ShieldCheck className="size-3" />
        ) : (
          <ShieldOff className="size-3" />
        )}
        {isRestricted ? 'Restricted' : 'Unrestricted'}
      </Badge>
    </>
  )
}
