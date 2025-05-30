import { CardMcpRegistryItem } from "./card-mcp-registry-item";
import type { McpRegistryItem } from "@/common/constants/mcp-registry";

export function GridCardsMcpRegistryItems({
  mcpRegistryItems,
}: {
  mcpRegistryItems: McpRegistryItem[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {mcpRegistryItems.map((mcpRegistryItem) => (
        <CardMcpRegistryItem
          key={mcpRegistryItem.name}
          description={mcpRegistryItem.description}
          name={mcpRegistryItem.name}
          stars={mcpRegistryItem.metadata.stars}
          last_updated={mcpRegistryItem.metadata.last_updated}
        />
      ))}
    </div>
  );
}
