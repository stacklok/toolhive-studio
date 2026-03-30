import { Button } from '@/common/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/common/components/ui/dialog'
import type { GithubComStacklokToolhivePkgSkillsInstalledSkill as InstalledSkill } from '@common/api/generated/types.gen'
import { useMutationUninstallSkill } from '../hooks/use-mutation-uninstall-skill'

interface DialogUninstallSkillProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  skill: InstalledSkill | null
}

export function DialogUninstallSkill({
  open,
  onOpenChange,
  skill,
}: DialogUninstallSkillProps) {
  const { mutateAsync: uninstallSkill, isPending } = useMutationUninstallSkill()

  const skillName = skill?.metadata?.name ?? skill?.reference ?? ''

  async function handleConfirm() {
    if (!skillName) return
    try {
      await uninstallSkill({
        path: { name: skillName },
        query: {
          scope: skill?.scope,
          project_root: skill?.project_root ?? undefined,
        },
      })
      onOpenChange(false)
    } catch {
      // Error toast is handled by useMutationUninstallSkill onError
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Uninstall skill</DialogTitle>
          <DialogDescription>
            Are you sure you want to uninstall{' '}
            <span className="font-semibold">{skillName}</span>? This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="secondary"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? 'Uninstalling...' : 'Uninstall'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
