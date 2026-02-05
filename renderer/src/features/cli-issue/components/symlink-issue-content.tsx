import { RefreshCw, Wrench } from 'lucide-react'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/common/components/ui/card'
import { Button } from '@/common/components/ui/button'

interface SymlinkIssueContentProps {
  type: 'broken' | 'tampered'
  target: string
  onRepair: () => void
  isLoading: boolean
}

export function SymlinkIssueContent({
  type,
  target,
  onRepair,
  isLoading,
}: SymlinkIssueContentProps) {
  const isBroken = type === 'broken'
  const title = isBroken
    ? 'CLI Installation Needs Repair'
    : 'CLI Installation Modified'
  const description = isBroken
    ? 'The ToolHive CLI symlink is broken.'
    : 'The ToolHive CLI has been modified externally.'
  const detail = isBroken
    ? 'This can happen if ToolHive UI was moved or updated.'
    : 'This could cause version compatibility issues.'
  const buttonText = isBroken ? 'Repair' : 'Restore'

  return (
    <>
      <CardHeader className="text-center">
        <div className="mb-4 flex justify-center">
          <Wrench className="text-warning size-12" />
        </div>
        <CardTitle className="text-2xl font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted rounded-md p-4 text-sm">
          <p>
            <strong>
              {isBroken ? 'Was pointing to:' : 'Currently pointing to:'}
            </strong>{' '}
            {target}
          </p>
        </div>
        <p className="text-muted-foreground text-sm">
          {detail} Would you like to {isBroken ? 'repair' : 'restore'} the CLI
          installation?
        </p>
        <Button
          onClick={onRepair}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <RefreshCw className="mr-2 size-4 animate-spin" />
          ) : (
            <Wrench className="mr-2 size-4" />
          )}
          {buttonText}
        </Button>
      </CardContent>
    </>
  )
}
