import { useState } from 'react'
import { ShieldAlert, Loader2 } from 'lucide-react'
import { Button } from '@/common/components/ui/button'
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
      <Button variant="ghost" size="xs" disabled>
        <Loader2 className="animate-spin" />
      </Button>
    )
  }

  if (error && !report) return null

  if (!report) return null

  const status = deriveComplianceStatus(report.summary)

  return (
    <>
      <Tooltip>
        {status !== 'compliant' && (
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setDialogOpen(true)}
            >
              <ShieldAlert className="size-5" />
            </Button>
          </TooltipTrigger>
        )}
        <TooltipContent className="max-w-xs">
          See MCP Compliance Report
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
