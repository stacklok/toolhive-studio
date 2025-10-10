import {
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/common/components/ui/alert'
import { LinkErrorDiscord } from './link-error-discord'

export function AlertErrorFetchingEditingData() {
  return (
    <Alert variant="destructive">
      <AlertTitle className="flex items-center justify-between">
        Something went wrong while retrieving the data of the server
      </AlertTitle>
      <AlertDescription>
        <p className="text-red-300">
          Close the dialog and try again. <br />
          If issues persist, contact the ToolHive team via <LinkErrorDiscord />.
        </p>
      </AlertDescription>
    </Alert>
  )
}
