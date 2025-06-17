import { SecretsTable } from '@/features/secrets/components/secrets-table'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/secrets')({
  component: Secrets,
})

function Secrets() {
  return <SecretsTable secrets={[]} />
}
