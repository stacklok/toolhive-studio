import { Button } from '@/common/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/common/components/ui/table'
import { Input } from '@/common/components/ui/input'
import { SecretDropdown } from './secret-dropdown'
import { useFilterSort } from '@/common/hooks/use-filter-sort'
import { ArrowUpDown, X } from 'lucide-react'
import type { V1SecretKeyResponse } from '@/common/api/generated'
interface SecretsTableProps {
  secrets: V1SecretKeyResponse[]
  setIsSecretDialogOpen: (open: boolean) => void
  setSecretKey: (key: string) => void
}

export function SecretsTable({
  secrets,
  setIsSecretDialogOpen,
  setSecretKey,
}: SecretsTableProps) {
  const {
    filter,
    setFilter,
    filteredData: filteredSecrets,
    toggleSortOrder,
  } = useFilterSort({
    data: secrets,
    filterFields: (secret) => [secret.key ?? ''],
    sortBy: (secret) => secret.key ?? '',
  })

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Input
          type="text"
          placeholder="Filter secrets..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pr-8"
        />
        {filter && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-1/2 right-1 size-6 -translate-y-1/2 p-0"
            onClick={() => setFilter('')}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table className="">
          <TableHeader>
            <TableRow>
              <TableHead className="text-muted-foreground flex items-center px-5 text-xs">
                Secrets
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-auto cursor-pointer p-1"
                  onClick={toggleSortOrder}
                >
                  <ArrowUpDown className="size-4" />
                </Button>
              </TableHead>
              <TableHead className="px-5 text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSecrets.map((secret) => (
              <TableRow key={secret.key}>
                <TableCell className="text-foreground pr-2 pl-5">
                  {secret.key}
                </TableCell>
                <TableCell className="pr-2 pl-5 text-right">
                  <SecretDropdown
                    onHandleClick={() => {
                      setIsSecretDialogOpen(true)
                      setSecretKey(secret.key ?? '')
                    }}
                    secretKey={secret.key ?? ''}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredSecrets.length === 0 && (
          <div className="text-muted-foreground py-12 text-center">
            <p className="text-sm">
              No secrets found matching the current filter
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
