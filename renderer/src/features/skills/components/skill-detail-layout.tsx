import type { ReactNode } from 'react'
import { RegistryDetailHeader } from '@/features/registry-servers/components/registry-detail-header'

interface SkillDetailLayoutProps {
  title: string
  backTo: string
  backSearch?: Record<string, unknown>
  badges?: ReactNode
  description?: string | null
  actions: ReactNode
  rightPanel?: ReactNode
}

export function SkillDetailLayout({
  title,
  backTo,
  backSearch,
  badges,
  description,
  actions,
  rightPanel,
}: SkillDetailLayoutProps) {
  return (
    <div className="flex max-h-full w-full flex-1 flex-col">
      <RegistryDetailHeader
        title={title}
        backTo={backTo}
        backSearch={backSearch}
        badges={badges}
      />

      <div className="mt-8 flex flex-col gap-10 md:flex-row">
        <div className="flex w-full flex-col gap-6 md:w-5/12">
          {description && (
            <div className="flex flex-col gap-2">
              <h4
                className="text-foreground text-xl font-semibold tracking-tight"
              >
                Summary
              </h4>
              <p className="text-muted-foreground text-base leading-7">
                {description}
              </p>
            </div>
          )}
          {actions}
        </div>

        {rightPanel && (
          <div className="flex flex-1 flex-col gap-3">{rightPanel}</div>
        )}
      </div>
    </div>
  )
}
