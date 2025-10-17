import { createFileRoute } from '@tanstack/react-router'
import { TitlePage } from '@/common/components/title-page'
import { McpServersSidebar } from '@/features/mcp-servers/components/mcp-servers-sidebar'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../utils/feature-flags'

export const Route = createFileRoute('/mcp-optimizer')({
  component: McpOptimizerRoute,
})

function McpOptimizerRoute() {
  const showSidebar = useFeatureFlag(featureFlagKeys.GROUPS)

  return (
    <div className="flex h-full gap-6">
      {showSidebar ? <McpServersSidebar /> : null}
      <div
        className={showSidebar ? 'ml-sidebar min-w-0 flex-1' : 'min-w-0 flex-1'}
      >
        <TitlePage title="MCP Optimizer">
          <></>
        </TitlePage>
        <div className="p-6">
          <h1 className="text-2xl font-bold">Hello World</h1>
        </div>
      </div>
    </div>
  )
}
