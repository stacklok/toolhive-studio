/**
 * Shared Tailwind class list for Streamdown-rendered markdown content.
 *
 * Keep in sync across all sites that render prose through Streamdown
 * (chat messages, SKILL.md viewer, etc.) so tweaks don't drift between
 * features.
 */
export const STREAMDOWN_PROSE_CLASS =
  'prose prose-sm text-foreground/80 [&_h1]:text-foreground/85 [&_h2]:text-foreground/80 [&_h3]:text-foreground/75 [&_table]:border-border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:text-foreground/75 [&_td]:border-border [&_a]:text-primary [&_strong]:text-foreground/90 [&_em]:text-foreground/75 [&_blockquote]:border-muted-foreground/30 max-w-none [&_a:hover]:underline [&_blockquote]:mb-3 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:text-xs [&_em]:italic [&_h1]:mt-3 [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h1:first-child]:mt-0 [&_h2]:mt-3 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2:first-child]:mt-0 [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-medium [&_h3:first-child]:mt-0 [&_li]:ml-2 [&_li]:text-sm [&_ol]:mb-2 [&_ol]:list-inside [&_ol]:list-decimal [&_ol]:space-y-0.5 [&_p]:mb-2 [&_p]:leading-relaxed [&_p:last-child]:mb-0 [&_pre]:text-xs [&_strong]:font-medium [&_table]:mb-4 [&_table]:min-w-full [&_table]:rounded-md [&_table]:border [&_td]:border [&_td]:px-3 [&_td]:py-2 [&_td]:text-xs [&_th]:border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_ul]:mb-2 [&_ul]:list-inside [&_ul]:list-disc [&_ul]:space-y-0.5'
