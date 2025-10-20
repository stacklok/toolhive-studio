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
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle />
        <AlertTitle>Unoptimized Access Detected</AlertTitle>
        <AlertDescription>
          <p>
            The <strong>claude</strong> client has unoptimized access to the{' '}
            <strong>foobar</strong> group. We recommend disabling the{' '}
            <strong>claude</strong> client in the <strong>foobar</strong> group
            and enabling optimization for the <strong>foobar</strong> group.
          </p>
        </AlertDescription>
      </Alert>
    </>
  )
}
