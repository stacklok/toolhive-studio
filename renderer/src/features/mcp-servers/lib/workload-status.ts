import type { CoreWorkload } from '@common/api/generated/types.gen'

// 'restarting' is a UI-only status, not part of the backend union type
type DisplayStatus = CoreWorkload['status'] | 'restarting'

const STATUS_LABELS: Partial<Record<NonNullable<DisplayStatus>, string>> = {
  removing: 'Deleting',
  restarting: 'Restarting',
  unauthenticated: 'Authentication required',
  auth_retrying: 'Retrying authentication',
  policy_stopped: 'Stopped by policy',
}

// Statuses where the server is not usable and the user likely has to act
// (restart to sign in again, or change the policy).
const WARNING_STATUSES: ReadonlyArray<DisplayStatus> = [
  'unauthenticated',
  'auth_retrying',
  'policy_stopped',
]

export function getWorkloadStatusLabel(status: DisplayStatus) {
  return (status && STATUS_LABELS[status]) ?? status
}

export function isWarningWorkloadStatus(status: DisplayStatus) {
  return WARNING_STATUSES.includes(status)
}
