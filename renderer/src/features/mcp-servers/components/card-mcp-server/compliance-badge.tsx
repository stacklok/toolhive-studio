import { useState } from 'react'
import { ShieldCheck, ShieldAlert, ShieldX, Loader2 } from 'lucide-react'
import { Badge } from '@/common/components/ui/badge'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/common/components/ui/tooltip'
import type { ComplianceReport } from '@common/types/mcp-compliance'
import { deriveComplianceStatus } from '@common/types/mcp-compliance'
import { ComplianceReportDialog } from './compliance-report-dialog'

interface ComplianceBadgeProps {
  report: ComplianceReport | null
  isChecking: boolean
  error: Error | null
}

export function ComplianceBadge({
  report,
  isChecking,
  error,
}: ComplianceBadgeProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  if (isChecking) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="animate-spin" />
        Checking…
      </Badge>
    )
  }

  if (error && !report) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="destructive" className="gap-1">
            <ShieldX />
            Error
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{error.message}</TooltipContent>
      </Tooltip>
    )
  }

  if (!report) return null

  const status = deriveComplianceStatus(report.summary)

  const badge = (() => {
    if (status === 'compliant') {
      return (
        <Badge
          variant="success"
          className="cursor-pointer gap-1"
          onClick={() => setDialogOpen(true)}
        >
          <ShieldCheck />
          Compliant
        </Badge>
      )
    }

    if (status === 'warnings') {
      return (
        <Badge
          variant="secondary"
          className="cursor-pointer gap-1"
          onClick={() => setDialogOpen(true)}
        >
          <ShieldAlert />
          {report.summary.warnings} warning
          {report.summary.warnings !== 1 && 's'}
        </Badge>
      )
    }

    return (
      <Badge
        variant="destructive"
        className="cursor-pointer gap-1"
        onClick={() => setDialogOpen(true)}
      >
        <ShieldX />
        {report.summary.failed} failed
      </Badge>
    )
  })()

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          See MCP Protocol Conformance Report 
        </TooltipContent>
      </Tooltip>
      <ComplianceReportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        report={report}
      />
    </>
  )
}
