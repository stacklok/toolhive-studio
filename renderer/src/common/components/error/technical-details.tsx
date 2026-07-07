import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppVersion } from '@/common/hooks/use-app-version'
import { Button } from '../ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible'
import { ChevronRight, Copy, Check } from 'lucide-react'
import {
  buildCrashReport,
  METADATA_FIELDS,
  type EnvironmentInfo,
} from './utils'

const COPY_FEEDBACK_MS = 2000

interface CopyButtonProps {
  getText: () => string
}

function CopyButton({ getText }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getText())
      setCopied(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS)
    } catch {
      // clipboard not available
    }
  }, [getText])

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className="text-muted-foreground hover:text-foreground size-7 shrink-0"
      aria-label={copied ? 'Copied' : 'Copy error report'}
      title={copied ? 'Copied!' : 'Copy error report'}
    >
      {copied ? (
        <Check className="text-success size-3.5" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </Button>
  )
}

function useEnvironmentInfo(enabled: boolean): EnvironmentInfo {
  const { data: appVersion } = useAppVersion()

  const { data: diagnostics } = useQuery({
    queryKey: ['error-diagnostics'],
    queryFn: async () => {
      const [thvStatus, engine] = await Promise.allSettled([
        window.electronAPI.getToolhiveStatus(),
        window.electronAPI.checkContainerEngine(),
      ])
      return {
        toolhiveRunning:
          thvStatus.status === 'fulfilled'
            ? thvStatus.value.isRunning
              ? 'yes'
              : 'no'
            : 'N/A',
        containerEngine:
          engine.status === 'fulfilled'
            ? engine.value.available
              ? 'available'
              : 'unavailable'
            : 'N/A',
      }
    },
    retry: false,
    enabled,
  })

  return {
    desktopVersion: appVersion?.currentVersion ?? 'N/A',
    cliVersion: appVersion?.toolhiveVersion ?? 'N/A',
    platform: window.electronAPI?.platform ?? navigator.platform,
    userAgent: navigator.userAgent,
    toolhiveRunning: diagnostics?.toolhiveRunning ?? 'N/A',
    containerEngine: diagnostics?.containerEngine ?? 'N/A',
  }
}

interface TechnicalDetailsProps {
  error: Error
}

export function TechnicalDetails({ error }: TechnicalDetailsProps) {
  const [open, setOpen] = useState(false)
  const env = useEnvironmentInfo(open)

  const getCrashReport = useCallback(
    () => buildCrashReport(error, env),
    [error, env]
  )

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground -ml-2 gap-1
            text-xs"
        >
          <ChevronRight
            className={`size-3 transition-transform ${open ? 'rotate-90' : ''}`}
          />
          {open ? 'Hide' : 'Show'} details
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="bg-muted mt-2 space-y-3 rounded-md p-3">
          <div className="flex items-center gap-2">
            <p
              className="text-muted-foreground min-w-0 flex-1 text-sm break-all"
            >
              {error.toString()}
            </p>
            <CopyButton getText={getCrashReport} />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {METADATA_FIELDS.map(({ label, key }) => (
              <span
                key={key}
                className="bg-background text-muted-foreground rounded-full
                  border px-2 py-0.5 text-[11px]"
              >
                {label}: {env[key]}
              </span>
            ))}
          </div>

          {error.stack && (
            <pre
              className="bg-background overflow-x-auto rounded-md border p-2
                font-mono text-[11px] leading-relaxed"
            >
              <code>{error.stack}</code>
            </pre>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
