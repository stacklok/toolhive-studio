import { HelpCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/common/components/ui/dropdown-menu'
import { NavIconButton } from '@/common/components/layout/top-nav/nav-icon-button'
import { useNewsletterModal } from '@/common/contexts/newsletter-modal-context'
import {
  DISCORD_URL,
  DOCS_BASE_URL,
  GITHUB_ISSUES_URL,
  GITHUB_REPO_URL,
  PRIVACY_POLICY_URL,
} from '@common/app-info'

export function HelpDropdown({ className }: { className?: string }) {
  const { openNewsletterModal } = useNewsletterModal()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <NavIconButton aria-label="Help" className={className}>
          <HelpCircle className="size-5" />
        </NavIconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <a
            href={DOCS_BASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            Documentation
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            Discord Community
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={GITHUB_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            Send Feedback
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            GitHub Repository
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={openNewsletterModal}
          className="cursor-pointer"
        >
          Newsletter
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={PRIVACY_POLICY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            Privacy Policy
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
