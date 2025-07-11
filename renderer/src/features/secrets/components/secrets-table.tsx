import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/common/components/ui/table'
import { SecretDropdown } from './secret-dropdown'
import { useFilterSort } from '@/common/hooks/use-filter-sort'
import type { V1SecretKeyResponse } from '@/common/api/generated'
import { InputSearch } from '@/common/components/ui/input-search'
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
  } = useFilterSort({
    data: secrets,
    filterFields: (secret) => [secret.key ?? ''],
    sortBy: (secret) => secret.key ?? '',
  })

  return (
    <div className="space-y-6">
      <InputSearch
        value={filter}
        onChange={(v) => setFilter(v)}
        placeholder="Search..."
      />
      <div className="overflow-hidden rounded-md border">
        <Table className="">
          <TableHeader>
            <TableRow>
              <TableHead className="text-muted-foreground flex items-center px-5 text-xs">
                Secrets
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
