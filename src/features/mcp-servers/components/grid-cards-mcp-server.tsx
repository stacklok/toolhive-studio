import type { RuntimeContainerInfo } from "@/common/api/generated";
import { CardMcpServer } from "./card-mcp-server";
import { useState, useMemo } from "react";
import { Input } from "@/common/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { Button } from "@/common/components/ui/button";
import { X } from "lucide-react";

export function GridCardsMcpServers({
  mcpServers,
}: {
  mcpServers: RuntimeContainerInfo[];
}) {
  const [filters, setFilters] = useState({
    text: "",
    state: "all",
  });

  const availableStates = useMemo(() => {
    const states = mcpServers
      .map((server) => server.State)
      .filter((state): state is string => Boolean(state))
      .filter((state, index, arr) => arr.indexOf(state) === index)
      .sort();
    return ["all", ...states];
  }, [mcpServers]);

  const filteredMcpServers = useMemo(() => {
    return mcpServers.filter((mcpServer) => {
      if (filters.text.trim()) {
        const searchTerm = filters.text.toLowerCase();
        const name = mcpServer.Name?.toLowerCase() || "";
        const image = mcpServer.Image?.toLowerCase() || "";
        if (!name.includes(searchTerm) && !image.includes(searchTerm)) {
          return false;
        }
      }

      if (filters.state !== "all" && mcpServer.State !== filters.state) {
        return false;
      }

      return true;
    });
  }, [mcpServers, filters]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-0 place-content-between w-full">
        <div className="col-span-4 flex-1 max-w-md relative">
          <Input
            type="text"
            placeholder="Filter by name or image..."
            value={filters.text}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, text: e.target.value }))
            }
            className="pr-10"
          />
          {filters.text && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFilters((prev) => ({ ...prev, text: "" }))}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>

        <div className="col-span-2 md:justify-items-end">
          <Select
            value={filters.state}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, state: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All States" />
            </SelectTrigger>
            <SelectContent>
              {availableStates.map((state) => (
                <SelectItem key={state} value={state}>
                  {state === "all"
                    ? "All States"
                    : state.charAt(0).toUpperCase() + state.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {filteredMcpServers.map((mcpServer) => (
          <CardMcpServer
            key={mcpServer.ID}
            image={mcpServer.Image}
            name={mcpServer.Name}
            state={mcpServer.State}
            status={mcpServer.Status}
          />
        ))}
      </div>

      {filteredMcpServers.length === 0 &&
        (filters.text || filters.state !== "all") && (
          <div className="text-center text-muted-foreground py-12">
            <p className="text-sm">
              No MCP servers found matching the current filters
            </p>
          </div>
        )}
    </div>
  );
}
