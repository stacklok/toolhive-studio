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
  const isIsolated = networkAccess === NETWORK_ACCESS_MODES.Proxy

  return (
    <>
      Network access
      <Badge
        variant={isIsolated ? 'success' : 'outline'}
        className="pointer-events-none font-normal"
      >
        {isIsolated ? (
          <ShieldCheck className="size-3" />
        ) : (
          <ShieldOff className="size-3" />
        )}
        {isIsolated ? 'Isolated' : 'Not isolated'}
      </Badge>
    </>
  )
}
