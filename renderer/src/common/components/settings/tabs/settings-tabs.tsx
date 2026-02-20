import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { ScrollArea } from '../../ui/scroll-area'
import { GeneralTab } from './general-tab'
import { VersionTab } from './version-tab'
import { LogsTab } from './logs-tab'
import { CliTab } from './cli-tab'
import { RegistryTab } from '../registry/registry-tab'
import { useAppVersion } from '@/common/hooks/use-app-version'
import {
  ArrowUpCircle,
  Wrench,
  CloudDownload,
  AppWindow,
  ListEnd,
  type LucideIcon,
  Command,
} from 'lucide-react'

type Tab = 'general' | 'registry' | 'cli' | 'version' | 'logs'
type TabItem = { label: string; value: Tab; icon: LucideIcon }

const TABS: TabItem[] = [
  { label: 'General', value: 'general', icon: Wrench },
  { label: 'Registry', value: 'registry', icon: CloudDownload },
  { label: 'CLI', value: 'cli', icon: Command },
  { label: 'Version', value: 'version', icon: AppWindow },
  { label: 'Logs', value: 'logs', icon: ListEnd },
] as const satisfies TabItem[]

interface SettingsTabsProps {
  defaultTab?: Tab
}

export function SettingsTabs({ defaultTab }: SettingsTabsProps) {
  const { data: appInfo, isLoading, error } = useAppVersion()
  const isProduction = import.meta.env.MODE === 'production'
  const isNewVersionAvailable = appInfo?.isNewVersionAvailable && isProduction

  return (
    <Tabs
      defaultValue={defaultTab || 'general'}
      orientation="vertical"
      className="-mx-8 flex h-full flex-row"
    >
      <div className="border-border -my-5 shrink-0 border-r px-3 py-5">
        <TabsList
          className="flex h-fit w-48 flex-col items-stretch justify-start gap-1
            border-none bg-transparent p-0"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:border-border
                  data-[state=active]:bg-background h-9 w-full flex-none
                  cursor-pointer justify-start gap-2 rounded-full py-2 pl-4
                  text-sm font-medium data-[state=active]:border
                  data-[state=active]:shadow-sm"
              >
                <Icon className="size-4" />
                {tab.label}
                {tab.value === 'version' && isNewVersionAvailable && (
                  <div className="bg-background rounded-full">
                    <ArrowUpCircle className="size-4 text-blue-500" />
                  </div>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </div>

      <ScrollArea className="h-full flex-1 px-8">
        <TabsContent value="general" className="mt-0">
          <GeneralTab />
        </TabsContent>

        <TabsContent value="registry" className="mt-0">
          <RegistryTab />
        </TabsContent>

        <TabsContent value="cli" className="mt-0">
          <CliTab />
        </TabsContent>

        <TabsContent value="version" className="mt-0">
          <VersionTab isLoading={isLoading} error={error} appInfo={appInfo} />
        </TabsContent>

        <TabsContent value="logs" className="mt-0">
          <LogsTab />
        </TabsContent>
      </ScrollArea>
    </Tabs>
  )
}
