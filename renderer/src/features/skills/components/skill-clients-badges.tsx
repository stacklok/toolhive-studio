import { Badge } from '@/common/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'

const MAX_VISIBLE_CLIENTS = 3

export function SkillClientsBadges({
  clients,
  maxVisible = MAX_VISIBLE_CLIENTS,
}: {
  clients: string[]
  maxVisible?: number
}) {
  if (!clients.length) {
    return null
  }

  const visibleClients = clients.slice(0, maxVisible)
  const hiddenClients = clients.slice(maxVisible)

  return (
    <>
      {visibleClients.map((client) => (
        <Badge key={client} variant="outline">
          {client}
        </Badge>
      ))}
      {hiddenClients.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge asChild variant="outline">
              <button
                type="button"
                aria-label={`${hiddenClients.length} more clients`}
              >
                +{hiddenClients.length}
              </button>
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <ul className="flex flex-col gap-0.5 text-xs">
              {hiddenClients.map((client) => (
                <li key={client}>{client}</li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      )}
    </>
  )
}
