import { Button } from '@/common/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog'
import type { GithubComStacklokToolhivePkgSkillsLocalBuild as LocalBuild } from '@common/api/generated/types.gen'
import { useMutationDeleteBuild } from '../hooks/use-mutation-delete-build'
import { trackEvent } from '@/common/lib/analytics'

interface DialogDeleteBuildProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  build: LocalBuild | null
  onSuccess?: () => void
}

export function DialogDeleteBuild({
  open,
  onOpenChange,
  build,
  onSuccess,
}: DialogDeleteBuildProps) {
  const { mutateAsync: deleteBuild, isPending } = useMutationDeleteBuild()

  const tag = build?.tag ?? ''
  const displayName = build?.name ?? tag

  async function handleConfirm() {
    if (!tag) return
    trackEvent('Skills: delete build dialog confirmed', { tag })
    try {
      await deleteBuild({ path: { tag } })
      onOpenChange(false)
      onSuccess?.()
    } catch {
      // Error toast is handled by useMutationDeleteBuild onError
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Remove build</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove{' '}
            <span className="font-semibold">{displayName}</span>? This will
            delete the local OCI artifact and its blobs.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="secondary"
            className="rounded-full"
            onClick={() => {
              trackEvent('Skills: delete build dialog cancelled')
              onOpenChange(false)
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? 'Removing...' : 'Remove'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
