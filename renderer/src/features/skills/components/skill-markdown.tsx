import { useQuery } from '@tanstack/react-query'
import { Streamdown } from 'streamdown'
import { code } from '@streamdown/code'
import { mermaid } from '@streamdown/mermaid'
import { cjk } from '@streamdown/cjk'
import { getApiV1BetaSkillsContent } from '@common/api/generated'
import { getApiV1BetaSkillsContentQueryKey } from '@common/api/generated/@tanstack/react-query.gen'
import { Skeleton } from '@/common/components/ui/skeleton'
import { STREAMDOWN_PROSE_CLASS } from '@/common/lib/streamdown-prose'

class SkillContentError extends Error {
  readonly status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

const STREAMDOWN_PLUGINS = { code, mermaid, cjk }

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
  skillRef,
  stripFrontmatter = false,
}: {
  /**
   * Content endpoint `ref` query value: an OCI reference, a `namespace/name`
   * pair, or a local build tag.
   */
  skillRef: string
  stripFrontmatter?: boolean
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: getApiV1BetaSkillsContentQueryKey({ query: { ref: skillRef } }),
    queryFn: async ({ signal }) => {
      const result = await getApiV1BetaSkillsContent({
        query: { ref: skillRef },
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
      className={STREAMDOWN_PROSE_CLASS}
    >
      {body}
    </Streamdown>
  )
}
