import { cn } from '@/common/lib/utils'
import type { McpPrompt } from '../types'

interface PromptsPanelProps {
  prompts: McpPrompt[]
}

export function PromptsPanel({ prompts }: PromptsPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div
        className="border-border bg-card flex flex-shrink-0 items-center
          justify-between border-b px-5 py-3"
      >
        <h2 className="text-base font-semibold">
          Prompts{' '}
          <span className="text-muted-foreground text-sm font-normal">
            ({prompts.length})
          </span>
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {prompts.length === 0 ? (
          <div
            className="text-muted-foreground flex h-full flex-col items-center
              justify-center gap-2"
          >
            <span className="text-sm">No prompts available</span>
            <span className="text-xs">
              Connect to an MCP server to see its prompts
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {prompts.map((p) => (
              <div
                key={p.name}
                className="border-border bg-card
                  hover:border-nav-button-active-bg cursor-pointer rounded-md
                  border px-3.5 py-2.5 transition-colors"
              >
                <div className="font-mono text-sm font-semibold">{p.name}</div>
                {p.description && (
                  <div className="text-muted-foreground mt-1 text-xs">
                    {p.description}
                  </div>
                )}
                {p.arguments && p.arguments.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {p.arguments.map((a) => (
                      <span
                        key={a.name}
                        className={cn(
                          'rounded px-1.5 py-0.5 font-mono text-[10px]',
                          a.required
                            ? `border border-yellow-500/50 bg-yellow-500/10
                              text-yellow-400`
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {a.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
