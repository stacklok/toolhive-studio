import { TooltipTrigger } from "@radix-ui/react-tooltip";
import { Tooltip, TooltipContent } from "./tooltip";
import { InfoIcon } from "lucide-react";
import type { ReactNode } from "react";

export function TooltipInfoIcon({ children }: { children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild autoFocus={false}>
        <InfoIcon className="size-4 text-muted-foreground rounded-full" />
      </TooltipTrigger>
      <TooltipContent>{children}</TooltipContent>
    </Tooltip>
  );
}
