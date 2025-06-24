import { EmptyState } from '@/common/components/empty-state'
import { IllustrationNoConnection } from '@/common/components/illustrations/illustration-no-connection'
import { Button } from '@/common/components/ui/button'
import { SecretsTable } from '@/features/secrets/components/secrets-table'
import { createFileRoute } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'

export const Route = createFileRoute('/secrets')({
  component: Secrets,
})

const SECRETS: {
  key: string
}[] = []

function Secrets() {
  return (
    <>
      <div className="mb-6 flex items-center">
        <h1 className="text-3xl font-semibold">Secrets</h1>
      </div>
      {SECRETS.length === 0 ? (
        <EmptyState
          title="No secrets yet"
          body="Add a secrets for use in your workloads. Secrets are encrypted and stored securely."
          actions={[
            <Button key="add" onClick={() => alert('This should add a secret')}>
              Add a secret <PlusIcon />
            </Button>,
          ]}
          illustration={IllustrationNoConnection}
        />
      ) : (
        <SecretsTable secrets={SECRETS} />
      )}
    </>
  )
}
