export default {
  "entry": ["src/main.tsx", "src/index.css"],
  "project": ["src/**"],
  "ignore": [
    "src/common/api/generated/**",
    "src/common/hooks/use-servers.ts",
    "src/common/lib/utils.ts"
  ],
  "ignoreDependencies": [
    "tailwindcss",
    "tw-animate-css",
    "tailwind-merge",
    "clsx",
    "class-variance-authority",
    "lucide-react",
    "@testing-library/user-event"
  ]
}
