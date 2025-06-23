import { SecretsTable } from '@/features/secrets/components/secrets-table'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/secrets')({
  component: Secrets,
})

function Secrets() {
  return (
    <>
      <div className="mb-6 flex items-center">
        <h1 className="text-3xl font-semibold">Secrets</h1>
      </div>
      <SecretsTable secrets={[]} />
    </>
  )
}
