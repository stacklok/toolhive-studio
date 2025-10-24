import {
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/common/components/ui/alert'
import { Progress } from '@/common/components/ui/progress'
import { Loader } from 'lucide-react'

interface ProgressInfo {
  value: number
  max: number
}

interface LoadingStateAlertProps {
  title: string
  description: React.ReactNode
  progress?: ProgressInfo
  className?: string
}

export function LoadingStateAlert({
  title,
  description,
  progress,
  className = 'relative space-y-4 px-6',
}: LoadingStateAlertProps) {
  return (
    <div className={className}>
      <Alert>
        <Loader className="size-4 animate-spin" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          {typeof description === 'string' ? (
            <span>{description}</span>
          ) : (
            <>{description}</>
          )}
          {progress && (
            <Progress
              value={(progress.value / progress.max) * 100}
              className="my-2 w-full"
            />
          )}
        </AlertDescription>
      </Alert>
    </div>
  )
}
