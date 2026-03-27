import { LinkErrorDiscord } from '../workloads/link-error-discord'
import { Button } from '../ui/button'
import { EmptyState } from '../empty-state'
import { Link } from '@tanstack/react-router'
import {
  isRegistryAuthRequiredError,
  isRegistryUnavailableError,
  REGISTRY_AUTH_REQUIRED_UI_MESSAGE,
  REGISTRY_UNAVAILABLE_UI_MESSAGE,
} from '../settings/registry/registry-errors'
import { IllustrationLock } from '../illustrations/illustration-lock'
import { IllustrationError } from '../illustrations/illustration-error'

export function RegistryError({ error }: { error: unknown }) {
  const isAuthRequired = isRegistryAuthRequiredError(error)
  const isUnavailable = isRegistryUnavailableError(error)

  const registrySettingsButton = (
    <Button asChild variant="secondary" className="mt-6 rounded-full" size="lg">
      <Link
        to="/settings"
        search={{ tab: 'registry' }}
        viewTransition={{ types: ['slide-left'] }}
      >
        Resolve issues
      </Link>
    </Button>
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center">
        <h1 className="text-page-title">Registry</h1>
      </div>
      {isAuthRequired ? (
        <EmptyState
          illustration={IllustrationLock}
          title="Authentication error"
          body={REGISTRY_AUTH_REQUIRED_UI_MESSAGE}
        >
          {registrySettingsButton}
        </EmptyState>
      ) : isUnavailable ? (
        <EmptyState
          illustration={IllustrationError}
          title="Registry unavailable"
          body={REGISTRY_UNAVAILABLE_UI_MESSAGE}
        >
          {registrySettingsButton}
        </EmptyState>
      ) : (
        <EmptyState
          illustration={IllustrationError}
          title="Failed to load registry"
          body="Something went wrong while loading the registry. Please check your registry settings or try again."
        >
          <div className="mt-8 flex flex-col items-center gap-4">
            <p className="text-muted-foreground text-sm">
              If issues persist, contact the ToolHive team via{' '}
              <LinkErrorDiscord />
            </p>
            {registrySettingsButton}
          </div>
        </EmptyState>
      )}
    </div>
  )
}
