import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { ScrollArea } from '../../ui/scroll-area'
import { GeneralTab } from './general-tab'
import { VersionTab } from './version-tab'
import { LogsTab } from './logs-tab'
import { CliTab } from './cli-tab'
import { RegistryTab } from '../registry/registry-tab'
import { useAppVersion } from '@/common/hooks/use-app-version'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '@utils/feature-flags'
import { ArrowUpCircle } from 'lucide-react'
import { useMemo } from 'react'

type Tab = 'general' | 'registry' | 'cli' | 'version' | 'logs'
type TabItem = { label: string; value: Tab }

const tabs: TabItem[] = [
  {
    label: 'General',
    value: 'general',
  },
  {
    label: 'Registry',
    value: 'registry',
  },
  {
    label: 'CLI',
    value: 'cli',
  },
  {
    label: 'Version',
    value: 'version',
  },
  {
    label: 'Logs',
    value: 'logs',
  },
] as const satisfies TabItem[]

interface SettingsTabsProps {
  defaultTab?: Tab
}

export function SettingsTabs({ defaultTab }: SettingsTabsProps) {
  const { data: appInfo, isLoading, error } = useAppVersion()
  const isProduction = import.meta.env.MODE === 'production'
  const isNewVersionAvailable = appInfo?.isNewVersionAvailable && isProduction
  const isCliEnforcementEnabled = useFeatureFlag(
    featureFlagKeys.CLI_VALIDATION_ENFORCE
  )

  const visibleTabs = useMemo(
    () =>
      isCliEnforcementEnabled
        ? tabs
        : tabs.filter((tab) => tab.value !== 'cli'),
    [isCliEnforcementEnabled]
  )

  return (
    <>
      <Tabs
        defaultValue={defaultTab || 'general'}
        orientation="vertical"
        className="flex h-full flex-row gap-10"
      >
        <TabsList
          className="flex h-fit w-48 shrink-0 flex-col gap-2 border-none
            bg-transparent p-0"
        >
          {visibleTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-accent
                data-[state=active]:text-accent-foreground w-full cursor-pointer
                justify-start py-2 text-base data-[state=active]:shadow-none"
            >
              <div className="flex items-center gap-2">
                {tab.label}
                {tab.value === 'version' && isNewVersionAvailable && (
                  <div className="bg-background rounded-full">
                    <ArrowUpCircle className="size-4 text-blue-500" />
                  </div>
                )}
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        <ScrollArea className="h-[calc(100vh-10rem)] flex-1">
          <TabsContent value="general" className="space-y-6 pr-4">
            <GeneralTab />
          </TabsContent>

          <TabsContent value="registry" className="space-y-6 pr-4">
            <RegistryTab />
          </TabsContent>

          {isCliEnforcementEnabled && (
            <TabsContent value="cli" className="space-y-6 pr-4">
              <CliTab />
            </TabsContent>
          )}

          <TabsContent value="version" className="space-y-6 pr-4">
            <VersionTab isLoading={isLoading} error={error} appInfo={appInfo} />
          </TabsContent>

          <TabsContent value="logs" className="space-y-6 pr-4">
            <LogsTab />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </>
  )
}
