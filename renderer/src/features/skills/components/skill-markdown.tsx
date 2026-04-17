import { useQuery } from '@tanstack/react-query'
import { Streamdown } from 'streamdown'
import { code } from '@streamdown/code'
import { mermaid } from '@streamdown/mermaid'
import { cjk } from '@streamdown/cjk'
import { getApiV1BetaSkillsContent } from '@common/api/generated'
import { getApiV1BetaSkillsContentQueryKey } from '@common/api/generated/@tanstack/react-query.gen'
import { Skeleton } from '@/common/components/ui/skeleton'

class SkillContentError extends Error {
  readonly status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

const STREAMDOWN_PLUGINS = { code, mermaid, cjk }

const PROSE_CLASS =
  'prose prose-sm text-foreground/80 [&_h1]:text-foreground/85 [&_h2]:text-foreground/80 [&_h3]:text-foreground/75 [&_table]:border-border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:text-foreground/75 [&_td]:border-border [&_a]:text-primary [&_strong]:text-foreground/90 [&_em]:text-foreground/75 [&_blockquote]:border-muted-foreground/30 max-w-none [&_a:hover]:underline [&_blockquote]:mb-3 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:text-xs [&_em]:italic [&_h1]:mt-3 [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h1:first-child]:mt-0 [&_h2]:mt-3 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2:first-child]:mt-0 [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-medium [&_h3:first-child]:mt-0 [&_li]:ml-2 [&_li]:text-sm [&_ol]:mb-2 [&_ol]:list-inside [&_ol]:list-decimal [&_ol]:space-y-0.5 [&_p]:mb-2 [&_p]:leading-relaxed [&_p:last-child]:mb-0 [&_pre]:text-xs [&_strong]:font-medium [&_table]:mb-4 [&_table]:min-w-full [&_table]:rounded-md [&_table]:border [&_td]:border [&_td]:px-3 [&_td]:py-2 [&_td]:text-xs [&_th]:border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_ul]:mb-2 [&_ul]:list-inside [&_ul]:list-disc [&_ul]:space-y-0.5'

function SkillMarkdownSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

const FRONTMATTER_REGEX = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/

export function SkillMarkdown({
  ociRef,
  stripFrontmatter = false,
}: {
  ociRef: string
  stripFrontmatter?: boolean
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: getApiV1BetaSkillsContentQueryKey({ query: { ref: ociRef } }),
    queryFn: async ({ signal }) => {
      const result = await getApiV1BetaSkillsContent({
        query: { ref: ociRef },
        signal,
      })
      if (result.error !== undefined) {
        const message =
          typeof result.error === 'string'
            ? result.error
            : 'Failed to load SKILL.md.'
        throw new SkillContentError(message, result.response?.status)
      }
      return result.data
    },
    retry: false,
  })

  if (isLoading) {
    return <SkillMarkdownSkeleton />
  }

  if (isError) {
    const status = error instanceof SkillContentError ? error.status : undefined
    const message =
      status === 404
        ? 'SKILL.md not found for this skill.'
        : status === 503
          ? 'Registry is currently unavailable. Try again later.'
          : 'Failed to load SKILL.md.'
    return (
      <p className="text-muted-foreground text-sm" data-testid="skill-md-error">
        {message}
      </p>
    )
  }

  const rawBody = data?.body
  const body =
    stripFrontmatter && rawBody
      ? rawBody.replace(FRONTMATTER_REGEX, '').trimStart()
      : rawBody
  if (!body) {
    return (
      <p className="text-muted-foreground text-sm" data-testid="skill-md-empty">
        No SKILL.md content available.
      </p>
    )
  }

  return (
    <Streamdown
      plugins={STREAMDOWN_PLUGINS}
      isAnimating={false}
      className={PROSE_CLASS}
    >
      {body}
    </Streamdown>
  )
}
