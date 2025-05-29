import { Button } from "@/common/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/common/components/ui/dropdown-menu";
import { PlusIcon } from "lucide-react";

// NOTE: To activate the Dialog component from within a Context Menu or Dropdown Menu,
// you must encase the Context Menu or Dropdown Menu component in the Dialog
// component.
// https://ui.shadcn.com/docs/components/dialog#:~:text=Share-,Notes,-To%20activate%20the
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
        <DropdownMenuItem aria-label="Run server from the registry">
          Run server from the registry
          <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => openRunCommandDialog()}
          aria-label="Run server with command"
        >
          Run server with command
          <DropdownMenuShortcut>⌘⇧N</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
