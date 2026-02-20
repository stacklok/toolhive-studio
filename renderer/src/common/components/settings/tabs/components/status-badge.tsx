import { CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '../../../ui/badge'

export function StatusBadge({ isValid }: { isValid: boolean }) {
  return isValid ? (
    <Badge variant="success">
      <CheckCircle2 className="mr-1 size-3" />
      Valid
    </Badge>
  ) : (
    <Badge variant="destructive">
      <XCircle className="mr-1 size-3" />
      Invalid
    </Badge>
  )
}
