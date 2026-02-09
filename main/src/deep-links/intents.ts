import { z } from 'zod/v4'

const safeString = z.string().regex(/^[a-zA-Z0-9_.-]+$/)

const VERSION = 'v1'

type NavigateTarget = { to: string; params?: Record<string, string> }

/**
 * Define a v1 deep link intent with its Zod schema and navigation handler
 * in a single place. The schema is used by the main process for validation,
 * and the navigate function is used by the renderer for routing.
 */
function v1Intent<A extends string, P extends z.ZodType>(config: {
  action: A
  params: P
  navigate: (params: z.output<P>) => NavigateTarget
}) {
  return {
    ...config,
    version: VERSION,
    schema: z.object({
      version: z.literal(VERSION),
      action: z.literal(config.action),
      params: config.params,
    }),
  }
}

// ── Intent definitions ─────────────────────────────────────────────────
// Add new intents here. Each definition is the single source of truth for
// its Zod validation schema AND its renderer-side navigation target.

export const openRegistryServerDetail = v1Intent({
  action: 'open-registry-server-detail',
  params: z.object({ serverName: safeString }),
  navigate: (params) => ({
    to: '/registry/$name',
    params: { name: params.serverName },
  }),
})

export const showNotFound = v1Intent({
  action: 'show-not-found',
  params: z.object({}),
  navigate: () => ({ to: '/deep-link-not-found' }),
})

// ── Registry ───────────────────────────────────────────────────────────

const allIntentsList = [openRegistryServerDetail, showNotFound] as const

type IntentDef = (typeof allIntentsList)[number]

export const intentsByAction: ReadonlyMap<string, IntentDef> = new Map(
  allIntentsList.map((intent) => [intent.action, intent])
)

export const deepLinkSchema = z.discriminatedUnion('action', [
  openRegistryServerDetail.schema,
  showNotFound.schema,
])

export type DeepLinkIntent = z.infer<typeof deepLinkSchema>
