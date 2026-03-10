import { cn } from '@/common/lib/utils'
import {
  Wrench,
  FileText,
  MessageSquare,
  AlignJustify,
  Clock,
} from 'lucide-react'
import type { CoreWorkload } from '@common/api/generated/types.gen'
import type { ActivePanel, McpServerData } from '../types'

interface InspectorSidebarProps {
  workloads: CoreWorkload[]
  selectedWorkload: CoreWorkload | null
  onWorkloadSelect: (w: CoreWorkload) => void
  serverData: McpServerData | null
  activePanel: ActivePanel
  onPanelChange: (p: ActivePanel) => void
}

const NAV_ITEMS: Array<{
  id: ActivePanel
  label: string
  icon: React.ReactNode
  section: 'explore' | 'debug'
}> = [
  {
    id: 'tools',
    label: 'Tools',
    icon: <Wrench className="size-4" />,
    section: 'explore',
  },
  {
    id: 'resources',
    label: 'Resources',
    icon: <FileText className="size-4" />,
    section: 'explore',
  },
  {
    id: 'prompts',
    label: 'Prompts',
    icon: <MessageSquare className="size-4" />,
    section: 'explore',
  },
  {
    id: 'headers',
    label: 'Headers',
    icon: <AlignJustify className="size-4" />,
    section: 'debug',
  },
  {
    id: 'history',
    label: 'History',
    icon: <Clock className="size-4" />,
    section: 'debug',
  },
]

function navCount(
  id: ActivePanel,
  serverData: McpServerData | null
): number | null {
  if (!serverData) return null
  if (id === 'tools') return serverData.tools.length
  if (id === 'resources') return serverData.resources.length
  if (id === 'prompts') return serverData.prompts.length
  return null
}

export function InspectorSidebar({
  workloads,
  selectedWorkload,
  onWorkloadSelect,
  serverData,
  activePanel,
  onPanelChange,
}: InspectorSidebarProps) {
  const exploreItems = NAV_ITEMS.filter((i) => i.section === 'explore')
  const debugItems = NAV_ITEMS.filter((i) => i.section === 'debug')

  return (
    <div
      className="border-border bg-card flex w-60 flex-shrink-0 flex-col
        border-r"
    >
      {/* Servers */}
      <div className="border-border border-b p-3">
        <div
          className="text-muted-foreground mb-2 text-[10px] font-semibold
            tracking-wider uppercase"
        >
          Running Servers
        </div>
        <div className="flex flex-col gap-2">
          {workloads.length === 0 && (
            <div
              className="border-border text-muted-foreground rounded-md border
                border-dashed px-3 py-4 text-center text-xs"
            >
              No running servers
            </div>
          )}
          {workloads.map((w) => (
            <button
              key={w.name}
              onClick={() => onWorkloadSelect(w)}
              className={cn(
                'w-full rounded-md border px-3 py-2.5 text-left transition-all',
                selectedWorkload?.name === w.name
                  ? 'border-nav-button-active-bg bg-nav-button-active-bg/10'
                  : `border-border bg-background
                    hover:border-nav-button-active-bg`
              )}
            >
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-success shrink-0"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 12l2 2 4-4" />
                </svg>
                {w.name ?? 'Unknown'}
              </div>
              <div className="text-muted-foreground mt-1 text-xs">
                {w.proxy_mode ?? w.transport_type ?? 'unknown'}
              </div>
              <div className="text-foreground/70 mt-0.5 font-mono text-xs">
                port {w.port}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div
          className="text-muted-foreground mb-1 px-2 py-1 text-[10px]
            font-semibold tracking-wider uppercase"
        >
          Explore
        </div>
        {exploreItems.map((item) => {
          const count = navCount(item.id, serverData)
          return (
            <button
              key={item.id}
              onClick={() => onPanelChange(item.id)}
              className={cn(
                `flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm
                transition-all`,
                activePanel === item.id
                  ? 'bg-nav-button-active-bg/15 text-nav-button-active-bg'
                  : `text-muted-foreground hover:bg-accent
                    hover:text-foreground`
              )}
            >
              {item.icon}
              {item.label}
              {count != null && (
                <span
                  className={cn(
                    'ml-auto rounded-full px-1.5 py-0.5 text-[11px]',
                    activePanel === item.id
                      ? 'bg-nav-button-active-bg/20 text-nav-button-active-bg'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}

        <div
          className="text-muted-foreground mt-4 mb-1 px-2 py-1 text-[10px]
            font-semibold tracking-wider uppercase"
        >
          Debug
        </div>
        {debugItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onPanelChange(item.id)}
            className={cn(
              `flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm
              transition-all`,
              activePanel === item.id
                ? 'bg-nav-button-active-bg/15 text-nav-button-active-bg'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
