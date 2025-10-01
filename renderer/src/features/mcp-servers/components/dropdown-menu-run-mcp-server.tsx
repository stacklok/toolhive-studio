import { Button } from '@/common/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/common/components/ui/dropdown-menu'
import { CloudIcon, DatabaseIcon, LaptopIcon, PlusIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { LinkViewTransition } from '@/common/components/link-view-transition'

export function DropdownMenuRunMcpServer({
  className,
  openRunCommandDialog,
}: {
  className?: string
  openRunCommandDialog: ({
    local,
    remote,
  }: {
    local: boolean
    remote: boolean
  }) => void
}) {
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        if (e.shiftKey) {
          e.preventDefault()
          openRunCommandDialog({ local: false, remote: false })
        } else {
          e.preventDefault()
          navigate({ to: '/registry' })
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate, openRunCommandDialog])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={className}>
          <PlusIcon />
          Add an MCP server
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end">
        <DropdownMenuItem
          onSelect={() => openRunCommandDialog({ local: true, remote: false })}
          aria-label="Custom MCP server"
        >
          <LaptopIcon />
          Add a local MCP server
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => openRunCommandDialog({ local: false, remote: true })}
          aria-label="Remote MCP server"
        >
          <CloudIcon />
          Add a remote MCP server
        </DropdownMenuItem>
        <DropdownMenuItem asChild aria-label="From the registry">
          <LinkViewTransition to="/registry">
            <DatabaseIcon />
            Add from registry
          </LinkViewTransition>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
