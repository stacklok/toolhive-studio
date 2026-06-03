import {
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/common/components/ui/alert'
import { Button } from '@/common/components/ui/button'
import { Separator } from '@/common/components/ui/separator'
import { X } from 'lucide-react'
import { LinkErrorDiscord } from './link-error-discord'
import { COMPANY_NAME, THV_DISPLAY_NAME } from '@common/app-info'

interface AlertErrorFormSubmissionProps {
  error: string
  isErrorSecrets: boolean
  onDismiss: () => void
}

function getErrorTitle(error: string): string {
  if (error.includes('Failed to retrieve MCP server image')) {
    return `${THV_DISPLAY_NAME} could not download the server image`
  }
  return 'Something went wrong'
}

export function AlertErrorFormSubmission({
  error,
  isErrorSecrets,
  onDismiss,
}: AlertErrorFormSubmissionProps) {
  const errorTitle = getErrorTitle(error)

  return (
    <Alert variant="destructive">
      <AlertTitle className="flex items-center justify-between">
        {errorTitle}
        <Button
          variant="ghost"
          className="cursor-pointer"
          size="xs"
          onClick={onDismiss}
        >
          <X />
        </Button>
      </AlertTitle>
      <AlertDescription>
        <p className="text-red-300">
          {isErrorSecrets && 'Failed to create secrets for the server. '}
          Check the configuration and try again. <br />
          If issues persist, contact the {COMPANY_NAME} team via{' '}
          <LinkErrorDiscord />.
        </p>
        {!isErrorSecrets && (
          <>
            <Separator className="my-2" />
            <p className="font-mono text-xs text-gray-300">{error}</p>
          </>
        )}
      </AlertDescription>
    </Alert>
  )
}
