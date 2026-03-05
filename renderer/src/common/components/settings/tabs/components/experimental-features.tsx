import { WrapperField } from './wrapper-field'
import { Switch } from '@/common/components/ui/switch'
import { Separator } from '@/common/components/ui/separator'
import { useExperimentalFeatures } from '@/common/hooks/use-experimental-features'
import { SettingsSectionTitle } from './settings-section-title'

export function ExperimentalFeatures() {
  const {
    flags,
    isLoadingFlags,
    isPending,
    handleToggle,
    formatFeatureFlagName,
    formatFeatureFlagDescription,
  } = useExperimentalFeatures()

  if (isLoadingFlags) {
    return (
      <div>
        <SettingsSectionTitle>Experimental</SettingsSectionTitle>
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    )
  }

  if (!flags?.length) {
    return (
      <div>
        <SettingsSectionTitle>Experimental</SettingsSectionTitle>
        <p className="text-muted-foreground text-sm">
          No experimental features available
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <SettingsSectionTitle>Experimental</SettingsSectionTitle>
      <div className="flex flex-col gap-3 py-1">
        {flags?.map(({ key, enabled }, index) => {
          const flagId = `feature-flag-${key}`

          return (
            <div key={key} className="flex flex-col gap-3">
              <WrapperField
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
              {index < flags.length - 1 && <Separator />}
            </div>
          )
        })}
        <Separator />
      </div>
    </div>
  )
}
