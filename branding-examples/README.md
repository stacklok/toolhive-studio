# Branding examples

JSON files matching the `BrandingConfig` schema (`common/branding/schema.ts`). Point `BRANDING_CONFIG_PATH` at one and launch — they replace the default Stacklok palette without touching code.

- `test-theme.json` — wine / coral / gold palette, deliberately distinct from studio's defaults. Used by `pnpm run start:customTheme` to stress-test that every themeable surface is wired to the override.

To use any of these on a normal launch, copy to `<userData>/branding-0.json`:

```bash
# Linux
cp branding-examples/test-theme.json ~/.config/ToolHive/branding-0.json
# macOS
cp branding-examples/test-theme.json "$HOME/Library/Application Support/ToolHive/branding-0.json"
```

Or override the path entirely:

```bash
BRANDING_CONFIG_PATH="$PWD/branding-examples/test-theme.json" pnpm run start
```

## Schema

See `common/branding/schema.ts`. Values must be complete CSS colors (`#hex`, `hsl(...)`, `oklch(...)`, `oklab(...)`, `rgb(...)`, `lab(...)`, `lch(...)`, `color(...)`, or CSS named colors). Bare HSL triplets like `0 60% 20%` are **not** supported — studio consumes vars as bare `var(--X)`, which needs a complete `<color>` value.
