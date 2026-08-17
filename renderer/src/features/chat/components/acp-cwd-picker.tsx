import { FolderOpen } from 'lucide-react'
import { toast } from 'sonner'
import log from 'electron-log/renderer'
import { Button } from '@/common/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { trackEvent } from '@/common/lib/analytics'
import { useAcpCwd } from '../hooks/use-chat-settings'

interface AcpCwdPickerProps {
  threadId?: string | null
}

export function AcpCwdPicker({ threadId }: AcpCwdPickerProps) {
  const { cwd, setCwd } = useAcpCwd(threadId)

  const handlePick = async () => {
    trackEvent('Playground: pick ACP working directory')
    try {
      const picked = await window.electronAPI.selectFolder()
      if (!picked) return
      await setCwd(picked)
    } catch (error) {
      log.error('Failed to set ACP working directory:', error)
      toast.error('Failed to set working directory')
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex h-8 items-center gap-1.5 px-2 has-[>svg]:px-2"
          aria-label="Choose ACP working directory"
          onClick={handlePick}
        >
          <FolderOpen className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {cwd ? `Working directory: ${cwd}` : 'Choose a working directory'}
      </TooltipContent>
    </Tooltip>
  )
}
