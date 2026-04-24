import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  CheckCircle2Icon,
  CodeIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FingerprintIcon,
  PackageIcon,
  TagIcon,
} from 'lucide-react'
import { Button } from '@/common/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { DialogInstallSkill } from '@/features/skills/components/dialog-install-skill'
import { trackEvent } from '@/common/lib/analytics'
import type { SkillBuildResult } from '../../lib/parse-skill-build-result'

function shortenDigest(digest: string | undefined): string | undefined {
  if (!digest) return undefined
  if (digest.startsWith('sha256:')) return `sha256:${digest.slice(7, 19)}…`
  return `${digest.slice(0, 12)}…`
}

function InfoChip({
  icon: Icon,
  label,
  value,
  mono = false,
  tooltip,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  mono?: boolean
  tooltip?: string
}) {
  const content = (
    <div
      className="border-border bg-background/60 text-muted-foreground flex
        items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs"
    >
      <Icon className="text-muted-foreground/70 size-3.5 shrink-0" />
      <span className="text-muted-foreground/80 shrink-0">{label}</span>
      <span
        className={`text-foreground truncate
          ${mono ? 'font-mono' : 'font-medium'}`}
      >
        {value}
      </span>
    </div>
  )
  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent className="max-w-xs font-mono text-xs break-all">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    )
  }
  return content
}

export function SkillBuildResultCard({ result }: { result: SkillBuildResult }) {
  const navigate = useNavigate()
  const [installOpen, setInstallOpen] = useState(false)

  const { reference, apiReference, build } = result
  const tag = build.tag
  const title = build.name ?? tag ?? reference
  const description = build.description
  const version = build.version
  const digest = build.digest
  const shortDigest = shortenDigest(digest)
  // Navigation target must exactly match a LocalBuild.tag; prefer apiReference
  // (the canonical tag returned by the build API), fall back to build.tag only
  // if it looks registry-prefixed (contains "/" or ":"). A bare version like
  // "v0.0.4" is NOT a valid route param for /skills/builds/$tag.
  const isRegistryRef = (v: string | undefined) =>
    !!v && (v.includes('/') || v.includes(':'))
  const navTag = apiReference ?? (isRegistryRef(tag) ? tag : undefined)
  const canViewDetails = !!navTag
  const installName = build.name ?? reference
  const installVersion = version
  const copyValue = build.name ?? reference

  const handleCopyReference = async () => {
    try {
      await navigator.clipboard.writeText(copyValue)
      toast.success('Copied skill name to clipboard')
      trackEvent('Skills: copy reference', { source: 'chat_build_result' })
    } catch {
      toast.error('Failed to copy skill name')
    }
  }

  return (
    <>
      <div
        className="my-3 overflow-hidden rounded-xl border border-emerald-500/25
          bg-linear-to-br from-emerald-500/5 via-transparent to-transparent
          shadow-sm"
        data-testid="skill-build-result-card"
      >
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-start gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center
                rounded-xl bg-emerald-500/15 text-emerald-600
                dark:text-emerald-400"
            >
              <PackageIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="text-muted-foreground flex items-center gap-1.5
                  text-xs font-medium tracking-wide uppercase"
              >
                <CheckCircle2Icon className="size-3.5 text-emerald-500" />
                Skill built
              </div>
              <h4
                className="text-foreground mt-0.5 truncate text-base
                  font-semibold"
                title={title}
              >
                {title}
              </h4>
              {description && (
                <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {version && (
              <InfoChip icon={TagIcon} label="Version" value={version} />
            )}
            {tag && <InfoChip icon={CodeIcon} label="Tag" value={tag} mono />}
            {shortDigest && (
              <InfoChip
                icon={FingerprintIcon}
                label="Digest"
                value={shortDigest}
                mono
                tooltip={digest}
              />
            )}
          </div>

          <div
            className="border-border/60 flex flex-wrap items-stretch
              justify-between gap-2 border-t pt-3"
          >
            <div className="flex flex-wrap items-stretch gap-2">
              <Button
                size="sm"
                onClick={() => {
                  trackEvent('Skills: install dialog opened', {
                    source: 'chat_build_result',
                  })
                  setInstallOpen(true)
                }}
                data-testid="chat-build-install"
              >
                <DownloadIcon className="size-4" />
                Install
              </Button>
              {canViewDetails && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    trackEvent('Skills: build card opened', {
                      has_tag: 'true',
                      source: 'chat_build_result',
                    })
                    void navigate({
                      to: '/skills/builds/$tag',
                      params: { tag: navTag! },
                    })
                  }}
                  data-testid="chat-build-view-details"
                >
                  <ExternalLinkIcon className="size-4" />
                  View details
                </Button>
              )}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyReference}
                  aria-label="Copy skill name"
                  data-testid="chat-build-copy-reference"
                >
                  <CopyIcon className="size-4" />
                  Copy name
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs font-mono text-xs break-all">
                {copyValue}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      <DialogInstallSkill
        key={`${installName}-${installVersion ?? ''}`}
        open={installOpen}
        onOpenChange={setInstallOpen}
        defaultReference={installName}
        defaultVersion={installVersion ?? ''}
      />
    </>
  )
}
