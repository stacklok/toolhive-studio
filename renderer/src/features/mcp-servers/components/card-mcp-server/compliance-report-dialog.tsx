import { useState } from 'react'
import { ExternalLink, ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog'
import { Badge } from '@/common/components/ui/badge'
import { ScrollArea } from '@/common/components/ui/scroll-area'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/common/components/ui/toggle-group'
import type {
  ComplianceReport,
  ComplianceCheckSeverity,
  ComplianceCheckResult,
} from '@common/types/mcp-compliance'

type BadgeVariant = 'destructive' | 'secondary' | 'success' | 'outline'

interface ComplianceReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: ComplianceReport
}

const SEVERITIES = ['pass', 'fail', 'warn', 'skip'] as const

const severityOrder: Record<ComplianceCheckSeverity, number> = {
  fail: 0,
  warn: 1,
  pass: 2,
  skip: 3,
}

const severityConfig: Record<
  ComplianceCheckSeverity,
  {
    label: string
    badgeVariant: BadgeVariant
    summaryLabel: string
  }
> = {
  pass: {
    label: 'Pass',
    badgeVariant: 'success',
    summaryLabel: 'Passed',
  },
  fail: {
    label: 'Fail',
    badgeVariant: 'destructive',
    summaryLabel: 'Failed',
  },
  warn: {
    label: 'Warning',
    badgeVariant: 'secondary',
    summaryLabel: 'Warnings',
  },
  skip: {
    label: 'Skipped',
    badgeVariant: 'outline',
    summaryLabel: 'Skipped',
  },
}

const summaryKeyMap: Record<
  ComplianceCheckSeverity,
  keyof ComplianceReport['summary']
> = {
  pass: 'passed',
  fail: 'failed',
  warn: 'warnings',
  skip: 'skipped',
}

function CheckRow({ check }: { check: ComplianceCheckResult }) {
  const config = severityConfig[check.severity]
  const specLinks = check.specReferences?.filter((ref) => ref.url) ?? []

  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <Badge variant={config.badgeVariant} className="shrink-0 text-xs">
        {config.label}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{check.name}</p>
        {check.message && (
          <p className="text-muted-foreground mt-0.5 text-xs leading-snug wrap-break-word">
            {check.message}
          </p>
        )}
        {specLinks.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {specLinks.map((ref) => (
              <a
                key={ref.id}
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
              >
                <ExternalLink className="size-3" />
                {ref.id}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function ComplianceReportDialog({
  open,
  onOpenChange,
  report,
}: ComplianceReportDialogProps) {
  const [activeFilters, setActiveFilters] = useState<string[]>([])

  const sortedChecks = [...report.checks].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  )

  const visibleChecks =
    activeFilters.length > 0
      ? sortedChecks.filter((c) => activeFilters.includes(c.severity))
      : sortedChecks

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" />
            MCP Compliance Report
          </DialogTitle>
          <DialogDescription>
            Results from the{' '}
            <a
              href="https://github.com/modelcontextprotocol/conformance"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              MCP Conformance Test Suite
            </a>
            , which verifies that this server correctly implements the{' '}
            <a
              href="https://modelcontextprotocol.io/specification"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Model Context Protocol specification
            </a>
            .
          </DialogDescription>
        </DialogHeader>

        <ToggleGroup
          type="multiple"
          value={activeFilters}
          onValueChange={setActiveFilters}
          variant="outline"
          className="justify-center"
        >
          {SEVERITIES.map((severity) => {
            const config = severityConfig[severity]
            const count = report.summary[summaryKeyMap[severity]]
            return (
              <ToggleGroupItem key={severity} value={severity}>
                <Badge
                  variant={config.badgeVariant}
                  className="pointer-events-none tabular-nums"
                >
                  {count}
                </Badge>
                {config.summaryLabel}
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>

        <ScrollArea className="max-h-[55vh]">
          <div className="space-y-2">
            {visibleChecks.map((check) => (
              <CheckRow key={check.id} check={check} />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
