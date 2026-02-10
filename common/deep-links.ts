// Deep link definitions — see docs/adr/001-deep-links.md

import { z } from 'zod/v4'

const safeIdentifier = z.string().regex(/^[a-zA-Z0-9_.-]+$/)

export const DEEP_LINK_PROTOCOL = 'toolhive-gui'

const VERSION = 'v1'

export type NavigateTarget = { to: string; params?: Record<string, string> }

/**
 * Define a v1 deep link with its Zod schema and navigation handler
 * in a single place. The schema is used by the main process for validation,
 * and the navigate function is used by the renderer for routing.
 */
function v1DeepLink<I extends string, P extends z.ZodType>(config: {
  intent: I
  params: P
  navigate: (params: z.output<P>) => NavigateTarget
}) {
  return {
    ...config,
    version: VERSION,
    schema: z.object({
      version: z.literal(VERSION),
      intent: z.literal(config.intent),
      params: config.params,
    }),
  }
}

// ── Deep link definitions ─────────────────────────────────────────────
// Add new deep links here. Each definition is the single source of truth
// for its Zod validation schema AND its renderer-side navigation target.

export const openRegistryServerDetail = v1DeepLink({
  intent: 'open-registry-server-detail',
  params: z.object({ serverName: safeIdentifier }),
  navigate: (params) => ({
    to: '/registry/$name',
    params: { name: params.serverName },
  }),
})

// /deep-link-not-found is not a real route. Navigating to a non-existent route
// triggers the notFoundComponent defined in __root.tsx, which is the desired effect.
// There is no harm in this being part of the public schema — an externally crafted
// toolhive-gui://v1/show-not-found link only shows a 404 page, which is the same
// outcome as any other invalid deep link URL.
export const showNotFound = v1DeepLink({
  intent: 'show-not-found',
  params: z.object({}),
  navigate: () => ({ to: '/deep-link-not-found' }),
})

// ── Registry ───────────────────────────────────────────────────────────

const allDeepLinks = [openRegistryServerDetail, showNotFound] as const

type DeepLinkDef = (typeof allDeepLinks)[number]

const deepLinksByIntent: ReadonlyMap<string, DeepLinkDef> = new Map(
  allDeepLinks.map((dl) => [dl.intent, dl])
)

export const deepLinkSchema = z.discriminatedUnion('intent', [
  openRegistryServerDetail.schema,
  showNotFound.schema,
])

export type DeepLinkIntent = z.infer<typeof deepLinkSchema>

/**
 * Resolve a validated deep link intent to a navigation target.
 * Called in the main process where types are fully known, so the
 * result can be sent over IPC without any type casts in the renderer.
 */
export function resolveDeepLinkTarget(
  deepLink: DeepLinkIntent
): NavigateTarget {
  const def = deepLinksByIntent.get(deepLink.intent)
  if (!def) {
    return showNotFound.navigate({})
  }
  // Safe: deepLink was Zod-validated, so params match the definition
  return (def.navigate as (params: DeepLinkIntent['params']) => NavigateTarget)(
    deepLink.params
  )
}
