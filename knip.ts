export default {
  entry: [
    "packages/rerender/src/renderer.tsx",
    "packages/rerender/src/index.css",
    "packages/main/main.ts",
    "packages/preload/preload.ts",
    "forge.config.ts",
    "packages/utils/fetch-thv.ts",
    "packages/rerender/vite.renderer.config.ts",
  ],
  project: ["packages/rerender/src/**"],
  paths: {
    "@/*": ["packages/rerender/src/*"],
  },
  ignore: [
    "packages/rerender/src/route-tree.gen.ts",
    "packages/rerender/src/routes/store.tsx",
    "packages/rerender/src/routes/clients.tsx",
    "packages/rerender/src/common/api/generated/**",
    "packages/rerender/src/common/hooks/use-servers.ts",
    "packages/rerender/src/common/lib/utils.ts",
    "packages/rerender/src/common/components/ui/**",
    "packages/rerender/src/vite-env.d.ts",
  ],
  ignoreDependencies: [
    "@electron-forge/maker-flatpak",
    "@electron-forge/publisher-github",
  ],
  compilers: {
    // this is needed to support css entry files
    // see: https://knip.dev/features/compilers#css
    css: (text: string) => [...text.matchAll(/(?<=@)import[^;]+/g)].join("\n"),
  },
};
