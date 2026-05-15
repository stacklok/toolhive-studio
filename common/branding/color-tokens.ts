// SEP#725 — brand color customization. Port of cloud-ui's `color-tokens.ts`
// (see `sep/enterprise/toolhive-cloud-ui/src/lib/color-tokens.ts`).
//
// Override values are emitted into a `<style>` tag at runtime, so they reach
// the browser as raw CSS. Values MUST be sanitized before emission to prevent
// stylesheet escape via `;`, `}`, comment markers, etc.

// Per-mode color overrides from `BrandingConfig.design_tokens.colors`.
export type ColorTokens = {
  light?: { [key: string]: string }
  dark?: { [key: string]: string }
}

// Allowlist of CSS variable names that may be overridden. Mirrors cloud-ui's
// list so a single `BrandingConfig` JSON is portable across both surfaces.
// Studio's `renderer/src/index.css` declares all of these except
// `avatar-background` and `destructive-foreground`; those two are silently
// no-ops here until studio's CSS adds them, but stay in the allowlist so
// configs authored for cloud-ui don't trip the unknown-key drop. The leading
// `--` is added at serialization time.
const COLOR_TOKEN_KEYS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'input',
  'ring',
  'avatar-background',
  'nav-background',
  'nav-border',
  'nav-button-active-bg',
  'nav-button-active-text',
  'nav-foreground',
  'success',
  'warning',
  'warning-foreground',
  'info',
  'info-foreground',
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
] as const

type ColorTokenKey = (typeof COLOR_TOKEN_KEYS)[number]

const COLOR_TOKEN_KEY_SET: ReadonlySet<string> = new Set(COLOR_TOKEN_KEYS)

// Longest plausible CSS color value (e.g. `oklch(0.5849 0.095 159.91 / 100%)`)
// is well under 50 chars; 100 is generous enough to absorb formatting variation
// while still capping pathological input that could explode the `<style>` body.
const MAX_VALUE_LENGTH = 100

// Reject any character or sequence that could close the property/declaration
// or open a comment inside the emitted `<style>` block. `url(` is blocked as
// defense-in-depth.
const UNSAFE_VALUE_PATTERN = /[;{}<>\n\r\\]|\/\*|\*\/|url\(/i

function isColorTokenKey(key: string): key is ColorTokenKey {
  return COLOR_TOKEN_KEY_SET.has(key)
}

function isValidColorTokenValue(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_VALUE_LENGTH &&
    !UNSAFE_VALUE_PATTERN.test(value)
  )
}

// Render one mode's color token map as a CSS declaration list (no surrounding
// selector). Unknown keys and unsafe values are dropped silently — partial
// output is preferable to no override at all.
export function tokensToCssDeclarations(
  tokens: ColorTokens['light'] | undefined
): string {
  if (!tokens) return ''
  const parts: string[] = []
  for (const [key, value] of Object.entries(tokens)) {
    if (!isColorTokenKey(key)) continue
    if (!isValidColorTokenValue(value)) continue
    parts.push(`--${key}: ${value};`)
  }
  return parts.join(' ')
}

// Selector choice — `:root:not(.dark)` for light, `.dark` for dark — matches
// cloud-ui. The `:not(.dark)` is load-bearing: a bare `:root` would tie with
// `.dark` on specificity and leak light values into dark mode via source
// order. `:root:not(.dark)` doesn't match in dark mode, so the cascade picks
// up the default `.dark` declaration in `renderer/src/index.css`.
export function colorTokensToStyleContent(
  tokens: ColorTokens | null | undefined
): string {
  if (!tokens) return ''
  const lightDecls = tokensToCssDeclarations(tokens.light)
  const darkDecls = tokensToCssDeclarations(tokens.dark)
  const blocks: string[] = []
  if (lightDecls) blocks.push(`:root:not(.dark) { ${lightDecls} }`)
  if (darkDecls) blocks.push(`.dark { ${darkDecls} }`)
  return blocks.join(' ')
}
