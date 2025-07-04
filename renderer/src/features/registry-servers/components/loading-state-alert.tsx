import {
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/common/components/ui/alert'
import { Progress } from '@/common/components/ui/progress'
import { Loader } from 'lucide-react'

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
  return (
    <div className="relative space-y-4 px-6">
      <Alert>
        <Loader className="size-4 animate-spin" />
        <AlertTitle>
          {isPendingSecrets ? 'Creating Secrets...' : 'Installing server...'}
        </AlertTitle>
        <AlertDescription>
          {isPendingSecrets && loadingSecrets
            ? loadingSecrets?.text
            : 'We are pulling the server image from the registry and installing it.'}
          {isPendingSecrets && loadingSecrets && (
            <Progress
              value={
                (loadingSecrets?.completedCount /
                  loadingSecrets?.secretsCount) *
                100
              }
              className="my-2 w-full"
            />
          )}
        </AlertDescription>
      </Alert>
    </div>
  )
}
