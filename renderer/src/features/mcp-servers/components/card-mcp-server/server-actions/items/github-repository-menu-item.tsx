import { Github } from 'lucide-react'
import { DropdownMenuItem } from '@/common/components/ui/dropdown-menu'

interface GithubRepositoryMenuItemProps {
  repositoryUrl: string
}

export function GithubRepositoryMenuItem({
  repositoryUrl,
}: GithubRepositoryMenuItemProps) {
  return (
    <DropdownMenuItem asChild>
      <a
        href={repositoryUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex cursor-pointer items-center"
      >
        <Github className="mr-2 h-4 w-4" />
        GitHub Repository
      </a>
    </DropdownMenuItem>
  )
}
