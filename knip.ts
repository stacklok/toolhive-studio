export default {
  entry: [
    'renderer/src/renderer.tsx',
    'renderer/src/index.css',
    'main/src/main.ts',
    'preload/src/preload.ts',
    'forge.config.ts',
    'utils/fetch-thv.ts',
    'renderer/vite.renderer.config.ts',
    'renderer/src/**/*.test.{ts,tsx}',
    'renderer/src/**/__tests__/**/*.{ts,tsx}',
    'renderer/src/common/test/**/*.{ts,tsx}',
    'renderer/src/common/mocks/**/*.{ts,tsx}',
  ],
  project: ['renderer/src/**'],
  paths: {
    '@/*': ['renderer/src/*'],
  },
  ignore: [
    'renderer/src/route-tree.gen.ts',
    'renderer/src/routes/store.tsx',
    'renderer/src/routes/clients.tsx',
    'renderer/src/common/api/generated/**',
    'renderer/src/common/hooks/use-servers.ts',
    'renderer/src/common/lib/utils.ts',
    'renderer/src/common/components/ui/**',
    'renderer/src/vite-env.d.ts',
  ],
  ignoreDependencies: [
    '@electron-forge/maker-flatpak',
    '@electron-forge/publisher-github',
    '@electron-forge/maker-base',
  ],
  compilers: {
    // this is needed to support css entry files
    // see: https://knip.dev/features/compilers#css
    css: (text: string) => [...text.matchAll(/(?<=@)import[^;]+/g)].join('\n'),
  },
}
