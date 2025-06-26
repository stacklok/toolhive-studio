import { Button } from '@/common/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/common/components/ui/dropdown-menu'
import { PlusIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'

export function DropdownMenuRunMcpServer({
  className,
  openRunCommandDialog,
}: {
  className?: string
  openRunCommandDialog: () => void
}) {
  const navigate = useNavigate()
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        if (e.shiftKey) {
          e.preventDefault()
          openRunCommandDialog()
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
          Add server
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end">
        <DropdownMenuItem asChild aria-label="From the registry">
          <Link to="/registry">From the registry</Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => openRunCommandDialog()}
          aria-label="Custom MCP server"
        >
          Custom MCP server
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
