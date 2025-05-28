export default {
  "entry": ["src/main.tsx", "src/index.css"],
  "project": ["src/**"],
  "ignore": [
    "src/common/api/generated/**",
    "src/common/hooks/use-servers.ts",
    "src/common/lib/utils.ts"
  ],
  "ignoreDependencies": [
    "tailwind-merge",
    "clsx",
    "class-variance-authority",
    "lucide-react",
    "@testing-library/user-event"
  ],
  compilers: {
    // this is needed to support css entry files
    css: (text: string) => [...text.matchAll(/(?<=@)import[^;]+/g)].join('\n'),
  },
}
