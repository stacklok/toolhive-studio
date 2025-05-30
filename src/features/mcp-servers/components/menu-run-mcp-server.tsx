import { Button } from "@/common/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/common/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";

export function DropdownMenuRunMcpServer({
  className,
  openRunCommandDialog,
}: {
  className?: string;
  openRunCommandDialog: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={className}>
          <PlusIcon />
          Run MCP server
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end">
        <DropdownMenuItem aria-label="From the registry" asChild>
          <Link to="/registry">
            From the registry
            <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => openRunCommandDialog()}
          aria-label="Custom MCP server"
        >
          Custom MCP server
          <DropdownMenuShortcut>⌘⇧N</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
