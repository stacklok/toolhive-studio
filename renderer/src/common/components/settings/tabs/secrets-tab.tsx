import { getApiV1BetaSecretsDefaultKeysOptions } from '@common/api/generated/@tanstack/react-query.gen'
import { SecretsTable } from '@/features/secrets/components/secrets-table'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { DialogFormSecret } from '@/features/secrets/components/dialog-form-secret'
import { Button } from '@/common/components/ui/button'
import { useMutationCerateSecret } from '@/features/secrets/hooks/use-mutation-create-secret'
import { useMutationUpdateSecret } from '@/features/secrets/hooks/use-mutation-update-secret'
import { SettingsSectionTitle } from './components/settings-section-title'
import { PlusIcon } from 'lucide-react'

export function SecretsTab() {
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
    <div className="space-y-3">
      <SettingsSectionTitle>Secrets</SettingsSectionTitle>

      {keys.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 py-24
            text-center"
        >
          <h2
            className="font-serif text-[34px] leading-[42px] font-light
              tracking-tight"
          >
            Securely store your secrets
          </h2>
          <p className="text-muted-foreground text-base leading-7">
            Create secrets to store API keys for use into your MCP Server
            configurations
          </p>
          <Button
            variant="action"
            className="mt-2 rounded-full"
            onClick={() => {
              setIsSecretDialogOpen(true)
              setSecretKey('')
            }}
          >
            <PlusIcon /> Add a secret
          </Button>
        </div>
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
    </div>
  )
}
