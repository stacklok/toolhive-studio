import { LoadingStateAlert as BaseLoadingStateAlert } from '@/common/components/ui/loading-state-alert'

interface LoadingStateAlertProps {
  isPendingSecrets: boolean
  loadingSecrets?: {
    text: string
    completedCount: number
    secretsCount: number
  } | null
}

export function LoadingStateAlert({
  isPendingSecrets,
  loadingSecrets,
}: LoadingStateAlertProps) {
  const title = isPendingSecrets
    ? 'Creating Secrets...'
    : 'Installing server...'
  const description =
    isPendingSecrets && loadingSecrets
      ? loadingSecrets.text
      : 'Downloading server image from the registry and installing.'

  const progress =
    isPendingSecrets && loadingSecrets
      ? {
          value: loadingSecrets.completedCount,
          max: loadingSecrets.secretsCount,
        }
      : undefined

  return (
    <BaseLoadingStateAlert
      title={title}
      description={description}
      progress={progress}
    />
  )
}
