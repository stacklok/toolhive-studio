import { MCP_REGISTRY } from "@/common/constants/mcp-registry";
import { GridCardsMcpRegistryItems } from "@/features/mcp-registry/components/grid-cards-mcp-registry-items";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/registry")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <div className="flex items-center mb-6">
        <h1 className="font-semibold text-3xl">Registry</h1>
      </div>
      <GridCardsMcpRegistryItems mcpRegistryItems={MCP_REGISTRY} />
    </>
  );
}
