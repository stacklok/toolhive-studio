import { WrapperField } from './wrapper-field'
import { Switch } from '@/common/components/ui/switch'
import { useExperimentalFeatures } from '@/common/hooks/use-experimental-features'

export function ExperimentalFeatures() {
  const {
    flags,
    isLoadingFlags,
    isExperimentalFeaturesEnabled,
    isPending,
    handleToggle,
    formatFeatureFlagName,
    formatFeatureFlagDescription,
  } = useExperimentalFeatures()

  if (isLoadingFlags) {
    return (
      <div>
        <h2 className="text-lg font-semibold">Experimental Features</h2>
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    )
  }

  if (!isExperimentalFeaturesEnabled) {
    return (
      <div>
        <h2 className="text-lg font-semibold">Experimental Features</h2>
        <p className="text-muted-foreground text-sm">
          No experimental features available
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Experimental Features</h2>

      {flags.map(({ key, enabled }) => {
        const flagId = `feature-flag-${key}`

        return (
          <WrapperField
            key={key}
            label={formatFeatureFlagName(key)}
            description={formatFeatureFlagDescription(key)}
            htmlFor={flagId}
          >
            <Switch
              id={flagId}
              checked={enabled}
              onCheckedChange={() => handleToggle(key, enabled)}
              disabled={isPending}
            />
          </WrapperField>
        )
      })}
    </div>
  )
}
