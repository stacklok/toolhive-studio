import { RegistryForm } from './registry-form'
import { SettingsSectionTitle } from '../tabs/components/settings-section-title'
import { useRegistryForm } from './use-registry-form'
import { usePermissions } from '@/common/contexts/permissions'
import { PERMISSION_KEYS } from '@/common/contexts/permissions/permission-keys'

export function RegistryTab() {
  const { canShow } = usePermissions()
  const readOnly = !canShow(PERMISSION_KEYS.SETTINGS_REGISTRY_TAB)
  const {
    form,
    onSubmit,
    onReset,
    isLoading,
    isResetting,
    hasRegistryError,
    isUnavailableError,
    registryAuthRequiredMessage,
  } = useRegistryForm()

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <SettingsSectionTitle>Registry</SettingsSectionTitle>
        <p className="text-muted-foreground text-sm leading-5.5">
          Choose between ToolHive default registry, a custom remote registry
          JSON URL, a custom local registry JSON file, or a custom registry
          server API URL.
        </p>
      </div>
      <RegistryForm
        form={form}
        onSubmit={onSubmit}
        onReset={onReset}
        isLoading={isLoading}
        isResetting={isResetting}
        hasRegistryError={hasRegistryError}
        isUnavailableError={isUnavailableError}
        registryAuthRequiredMessage={registryAuthRequiredMessage}
        readOnly={readOnly}
      />
    </div>
  )
}
