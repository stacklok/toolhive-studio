import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
import { LinkViewTransition } from '@/common/components/link-view-transition'
import { RegistryDetailHeader } from '@/features/registry-servers/components/registry-detail-header'
import { cn } from '@/common/lib/utils'

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
  const headerRef = useRef<HTMLDivElement>(null)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)

  useEffect(() => {
    const target = headerRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsHeaderVisible(entry?.isIntersecting ?? true),
      { threshold: 0 }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  const showStickyHeader = !isHeaderVisible

  return (
    <div className="flex max-h-full w-full flex-1 flex-col">
      <div ref={headerRef}>
        <RegistryDetailHeader
          title={title}
          backTo={backTo}
          backSearch={backSearch}
          badges={badges}
        />
      </div>

      <div className="mt-8 flex flex-col gap-10 md:flex-row md:items-start">
        <div className="flex w-full flex-col gap-6 md:sticky md:top-0 md:w-5/12">
          <div
            aria-hidden={!showStickyHeader}
            className={cn(
              `hidden grid-rows-[0fr]
              transition-[grid-template-rows,opacity,margin]`,
              'duration-200 ease-out motion-reduce:transition-none md:grid',
              showStickyHeader
                ? 'mb-0 opacity-100 md:grid-rows-[1fr]'
                : 'pointer-events-none -mb-6 opacity-0'
            )}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col gap-3 pb-1">
                <div>
                  <LinkViewTransition to={backTo} search={backSearch}>
                    <Button
                      variant="outline"
                      aria-label="Back"
                      className="rounded-full"
                      tabIndex={showStickyHeader ? 0 : -1}
                    >
                      <ChevronLeft className="size-4" />
                      Back
                    </Button>
                  </LinkViewTransition>
                </div>
                <h2
                  className="text-foreground m-0 truncate p-0 text-2xl
                    font-semibold tracking-tight"
                >
                  {title}
                </h2>
                {badges && (
                  <div className="flex flex-wrap items-center gap-2">
                    {badges}
                  </div>
                )}
              </div>
            </div>
          </div>

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
          <div className="flex min-w-0 flex-1 flex-col gap-3">{rightPanel}</div>
        )}
      </div>
    </div>
  )
}
