import { getApiV1BetaSecretsDefaultKeysOptions } from '@/common/api/generated/@tanstack/react-query.gen'
import { SecretsTable } from '@/features/secrets/components/secrets-table'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/secrets')({
  component: Secrets,
  loader: async ({ context: { queryClient } }) =>
    await queryClient.ensureQueryData(getApiV1BetaSecretsDefaultKeysOptions()),
})

function Secrets() {
  const {
    data: { keys = [] },
  } = useSuspenseQuery(getApiV1BetaSecretsDefaultKeysOptions())

  return (
    <>
      <div className="mb-6 flex items-center">
        <h1 className="text-3xl font-semibold">Secrets</h1>
      </div>
      {keys.length === 0 ? (
        <div>No secrets found</div>
      ) : (
        <SecretsTable secrets={keys} />
      )}
    </>
  )
}
