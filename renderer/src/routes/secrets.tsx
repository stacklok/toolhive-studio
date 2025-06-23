import { getApiV1BetaSecretsDefaultKeysOptions } from '@/common/api/generated/@tanstack/react-query.gen'
import { SecretsTable } from '@/features/secrets/components/secrets-table'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { DialogFormSecret } from '@/features/secrets/components/dialog-form-secret'
import { Button } from '@/common/components/ui/button'

export const Route = createFileRoute('/secrets')({
  component: Secrets,
  loader: async ({ context: { queryClient } }) =>
    await queryClient.ensureQueryData(getApiV1BetaSecretsDefaultKeysOptions()),
})

function Secrets() {
  const {
    data: { keys = [] },
  } = useSuspenseQuery(getApiV1BetaSecretsDefaultKeysOptions())
  const [isSecretDialogOpen, setIsSecretDialogOpen] = useState(false)
  const [secretKey, setSecretKey] = useState<string | undefined>(undefined)

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Secrets</h1>
        <Button
          variant="default"
          onClick={() => {
            setIsSecretDialogOpen(true)
            setSecretKey('')
          }}
        >
          Add Secret
        </Button>
      </div>

      {keys.length === 0 ? (
        <div>No secrets found</div>
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
      />
    </>
  )
}
