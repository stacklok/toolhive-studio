import { SecretsTable } from '@/features/secrets/components/secrets-table'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/secrets')({
  component: Secrets,
})
const SECRETS = {
  keys: [
    { key: 'Github' },
    { key: 'Grafana' },
    { key: 'Slack' },
    { key: 'Jira' },
  ],
}

function Secrets() {
  return <SecretsTable secrets={SECRETS.keys} />
}
