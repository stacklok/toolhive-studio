// Brand-color override serialization. Values are emitted into a `<style>`
// tag at runtime, so they MUST be sanitized before emission to prevent
// stylesheet escape via `;`, `}`, comment markers, etc.

// Values arrive as `unknown` because the schema deliberately doesn't constrain
// them — see `schema.ts`. Per-value validation happens in
// `isValidColorTokenValue` below.
export type ColorTokenMap = Record<string, unknown>

export type ColorTokens = {
  light?: ColorTokenMap
  dark?: ColorTokenMap
}

// Allowlist of CSS variable names that may be overridden. Keys not declared
// in `renderer/src/index.css` are silent no-ops. The leading `--` is added
// at serialization time.
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

// Caps pathological input that could explode the `<style>` body. Real values
// (e.g. `oklch(0.5849 0.095 159.91 / 100%)`) are well under 50 chars.
const MAX_VALUE_LENGTH = 100

// Reject anything that could close the property/declaration or open a comment
// inside the emitted `<style>` block. `url(` blocked as defense-in-depth.
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

// Unknown keys and unsafe values are dropped per-entry — partial output is
// preferable to no override at all. Each drop is warn-logged so a malformed
// override doesn't silently revert to default.
export function tokensToCssDeclarations(
  tokens: ColorTokenMap | undefined
): string {
  if (!tokens) return ''
  const parts: string[] = []
  for (const [key, value] of Object.entries(tokens)) {
    if (!isColorTokenKey(key)) {
      console.warn(
        `[branding] dropping unknown token "${key}" ` +
          `(not in the ${COLOR_TOKEN_KEYS.length}-key allowlist)`
      )
      continue
    }
    if (!isValidColorTokenValue(value)) {
      console.warn(
        `[branding] dropping unsafe value for "${key}" ` +
          `(must be a non-empty string ≤${MAX_VALUE_LENGTH} chars without ;{}<>/\\ etc.)`
      )
      continue
    }
    parts.push(`--${key}: ${value};`)
  }
  return parts.join(' ')
}

// `:not(.dark)` is load-bearing: a bare `:root` would tie with `.dark` on
// specificity and leak light values into dark mode via source order.
// `:root:not(.dark)` doesn't match in dark mode, so the cascade picks up
// the default `.dark` declaration in `renderer/src/index.css`.
export function colorTokensToStyleContent(
  tokens: ColorTokens | undefined
): string {
  if (!tokens) return ''
  const lightDecls = tokensToCssDeclarations(tokens.light)
  const darkDecls = tokensToCssDeclarations(tokens.dark)
  const blocks: string[] = []
  if (lightDecls) blocks.push(`:root:not(.dark) { ${lightDecls} }`)
  if (darkDecls) blocks.push(`.dark { ${darkDecls} }`)
  return blocks.join(' ')
}
