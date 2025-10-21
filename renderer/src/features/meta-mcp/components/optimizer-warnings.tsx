import type { ReactElement } from 'react'
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/common/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

export function OptimizerWarnings(): ReactElement {
  return (
    <>
      <Alert className="mb-6">
        <AlertTriangle />
        <AlertTitle>Experimental Feature</AlertTitle>
        <AlertDescription>
          This is an experimental feature currently under development.
        </AlertDescription>
      </Alert>
    </>
  )
}
