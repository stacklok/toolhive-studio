import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { GeneralTab } from './general-tab'
import { VersionTab } from './version-tab'
import { LogsTab } from './logs-tab'
import { RegistryTab } from '../registry/registry-tab'

type Tab = 'general' | 'registry' | 'version' | 'logs'
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
    label: 'Version',
    value: 'version',
  },
  {
    label: 'Logs',
    value: 'logs',
  },
] as const satisfies TabItem[]

export function SettingsTabs() {
  return (
    <>
      <Tabs
        defaultValue="general"
        orientation="vertical"
        className="flex flex-row items-start gap-10"
      >
        <TabsList
          className="flex h-fit w-48 shrink-0 flex-col gap-2 border-none
            bg-transparent p-0"
        >
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-accent
                data-[state=active]:text-accent-foreground w-full cursor-pointer
                justify-start py-2 text-base data-[state=active]:shadow-none"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <GeneralTab />
        </TabsContent>

        <TabsContent value="registry" className="space-y-6">
          <RegistryTab />
        </TabsContent>

        <TabsContent value="version" className="space-y-6">
          <VersionTab />
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <LogsTab />
        </TabsContent>
      </Tabs>
    </>
  )
}
