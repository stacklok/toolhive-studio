import { createFileRoute } from '@tanstack/react-router'
import { CliIssuePage } from '@/features/cli-issue/components/cli-issue-page'

export const Route = createFileRoute('/cli-issue')({
  component: CliIssuePage,
})
