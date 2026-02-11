import { Badge } from '@/common/components/ui/badge'
import type { EnvVarDrift } from '../lib/get-env-vars-drift'

export function DriftDetails({ drift }: { drift: EnvVarDrift }) {
  return (
    <div className="space-y-2">
      {drift.added.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-medium">
            New variables in this version:
          </p>
          <ul className="space-y-1">
            {drift.added.map((v) => (
              <li key={v.name} className="flex items-center gap-1.5 text-xs">
                <code className="bg-muted rounded px-1 py-0.5">{v.name}</code>
                {v.secret ? (
                  <Badge variant="outline" className="px-1 py-0 text-[10px]">
                    secret
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                    env
                  </Badge>
                )}
                {v.required && (
                  <Badge
                    variant="destructive"
                    className="px-1 py-0 text-[10px]"
                  >
                    required
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {drift.removed.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-medium">
            Variables no longer in registry:
          </p>
          <ul className="space-y-1">
            {drift.removed.map((v) => (
              <li
                key={v.name}
                className="text-muted-foreground flex items-center gap-1.5
                  text-xs line-through"
              >
                <code className="bg-muted rounded px-1 py-0.5">{v.name}</code>
                {v.secret ? (
                  <Badge variant="outline" className="px-1 py-0 text-[10px]">
                    secret
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                    env
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
