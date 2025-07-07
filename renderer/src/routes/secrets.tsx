import { getApiV1BetaSecretsDefaultKeysOptions } from '@/common/api/generated/@tanstack/react-query.gen'
import { SecretsTable } from '@/features/secrets/components/secrets-table'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { DialogFormSecret } from '@/features/secrets/components/dialog-form-secret'
import { Button } from '@/common/components/ui/button'
import { useMutationCerateSecret } from '@/features/secrets/hooks/use-mutation-create-secret'
import { useMutationUpdateSecret } from '@/features/secrets/hooks/use-mutation-update-secret'
import { PlusIcon } from 'lucide-react'
import { IllustrationNoConnection } from '@/common/components/illustrations/illustration-no-connection'
import { EmptyState } from '@/common/components/empty-state'

export const Route = createFileRoute('/secrets')({
  component: Secrets,
  loader: async ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(getApiV1BetaSecretsDefaultKeysOptions()),
})

export function Secrets() {
  const {
    data: { keys = [] },
  } = useSuspenseQuery(getApiV1BetaSecretsDefaultKeysOptions())
  const [isSecretDialogOpen, setIsSecretDialogOpen] = useState(false)
  const [secretKey, setSecretKey] = useState<string | undefined>(undefined)
  const { mutateAsync: createSecret } = useMutationCerateSecret()
  const { mutateAsync: updateSecret } = useMutationUpdateSecret(secretKey ?? '')

  const onSubmit = async (data: { key?: string; value: string }) => {
    if (data.key) {
      await createSecret({
        body: {
          key: data.key,
          value: data.value,
        },
      })
    } else {
      await updateSecret({
        path: {
          key: secretKey ?? '',
        },
        body: {
          value: data.value,
        },
      })
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Secrets</h1>
        <Button
          variant="default"
          onClick={() => {
            setIsSecretDialogOpen(true)
            setSecretKey('')
          }}
        >
          <PlusIcon /> Add secret
        </Button>
      </div>

      {keys.length === 0 ? (
        <EmptyState
          title="Securely store your secrets"
          body="Create secrets to store API keys for use into your MCP Server configurations"
          actions={[
            <Button
              variant="default"
              key="add"
              onClick={() => {
                setIsSecretDialogOpen(true)
                setSecretKey('')
              }}
            >
              Add your first Secret
            </Button>,
          ]}
          illustration={IllustrationNoConnection}
        />
      ) : (
        <SecretsTable
          secrets={keys}
          setIsSecretDialogOpen={setIsSecretDialogOpen}
          setSecretKey={setSecretKey}
        />
      )}

      <DialogFormSecret
        secretKey={secretKey}
        isOpen={isSecretDialogOpen}
        onOpenChange={setIsSecretDialogOpen}
        onSubmit={onSubmit}
      />
    </>
  )
}
