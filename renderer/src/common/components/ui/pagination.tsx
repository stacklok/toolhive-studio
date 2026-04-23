import {
  ChevronFirstIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react'

import { cn } from '@/common/lib/utils'
import { Button } from '@/common/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/common/components/ui/select'

export const DEFAULT_PAGE_SIZE_OPTIONS = [12, 24, 50, 100] as const

type PaginationProps = {
  page: number
  pageSize: number
  total: number
  pageSizeOptions?: readonly number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  className?: string
  itemLabel?: string
}

export function Pagination({
  page,
  pageSize,
  total,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange,
  className,
  itemLabel = 'results',
}: PaginationProps) {
  const smallestOption = Math.min(...pageSizeOptions)
  if (total <= 0 || total <= smallestOption) {
    return null
  }

  const safePage = Math.max(1, page)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(safePage, totalPages)
  const firstItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const lastItem = Math.min(currentPage * pageSize, total)
  const isFirstPage = currentPage <= 1
  const isLastPage = currentPage >= totalPages

  return (
    <div
      className={cn(
        `bg-background flex h-[52px] items-center justify-between rounded-md
        border py-2 pr-2 pl-4`,
        className
      )}
      data-slot="pagination"
    >
      <p className="text-muted-foreground text-sm">
        Showing {firstItem}-{lastItem} of {total} {itemLabel}
      </p>
      <div className="flex items-center justify-center gap-2 opacity-80">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Go to first page"
          disabled={isFirstPage}
          onClick={() => onPageChange(1)}
        >
          <ChevronFirstIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Go to previous page"
          disabled={isFirstPage}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeftIcon />
        </Button>
        <p
          className="text-foreground px-1 text-sm whitespace-nowrap"
          aria-live="polite"
        >
          Page {currentPage}
        </p>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Go to next page"
          disabled={isLastPage}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRightIcon />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-secondary-foreground text-sm whitespace-nowrap">
          Items per page
        </p>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger
            aria-label="Items per page"
            className="h-10 border-0 shadow-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {pageSizeOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
