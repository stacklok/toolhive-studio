import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog'
import { Button } from '@/common/components/ui/button'
import { Loader2 } from 'lucide-react'

interface LlmGatewayLoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRetry: () => void
  isRetrying?: boolean
  message?: string | null
}

export function LlmGatewayLoginModal({
  open,
  onOpenChange,
  onRetry,
  isRetrying = false,
  message,
}: LlmGatewayLoginModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in to Stacklok Gateway</DialogTitle>
          <DialogDescription>
            Complete sign-in in your browser. The LLM proxy may have opened an
            OIDC login page — finish that flow, then return here and continue.
          </DialogDescription>
        </DialogHeader>
        {message ? (
          <p className="text-muted-foreground text-sm">{message}</p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onRetry} disabled={isRetrying}>
            {isRetrying ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Checking…
              </>
            ) : (
              'I completed sign-in'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
