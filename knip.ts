export default {
  entry: [
    "rerender/src/renderer.tsx",
    "rerender/src/index.css",
    "main/main.ts",
    "preload/preload.ts",
    "forge.config.ts",
    "utils/fetch-thv.ts",
    "rerender/vite.renderer.config.ts",
    "rerender/src/**/*.test.{ts,tsx}",
    "rerender/src/**/__tests__/**/*.{ts,tsx}",
    "rerender/src/common/test/**/*.{ts,tsx}",
    "rerender/src/common/mocks/**/*.{ts,tsx}",
    "rerender/vitest.setup.ts",
  ],
  project: ["rerender/src/**"],
  paths: {
    "@/*": ["rerender/src/*"],
  },
  ignore: [
    "rerender/src/route-tree.gen.ts",
    "rerender/src/routes/store.tsx",
    "rerender/src/routes/clients.tsx",
    "rerender/src/common/api/generated/**",
    "rerender/src/common/hooks/use-servers.ts",
    "rerender/src/common/lib/utils.ts",
    "rerender/src/common/components/ui/**",
    "rerender/src/vite-env.d.ts",
  ],
  ignoreDependencies: [
    "@electron-forge/maker-flatpak",
    "@electron-forge/publisher-github",
    "@vitest/coverage-istanbul",
  ],
  compilers: {
    // this is needed to support css entry files
    // see: https://knip.dev/features/compilers#css
    css: (text: string) => [...text.matchAll(/(?<=@)import[^;]+/g)].join("\n"),
  },
};
