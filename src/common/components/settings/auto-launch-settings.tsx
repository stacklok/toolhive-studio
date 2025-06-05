import { useEffect, useState } from "react";
import { Switch } from "@/common/components/ui/switch";
import { Label } from "@/common/components/ui/label";
import { toast } from "sonner";

export function AutoLaunchSettings() {
  const [isAutoLaunchEnabled, setIsAutoLaunchEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAutoLaunchStatus() {
      try {
        if (window.electronAPI) {
          const status = await window.electronAPI.getAutoLaunchStatus();
          setIsAutoLaunchEnabled(status);
        }
      } catch (error) {
        console.error("Failed to load auto-launch status:", error);
        toast.error("Failed to load auto-launch settings");
      } finally {
        setIsLoading(false);
      }
    }

    loadAutoLaunchStatus();
  }, []);

  const handleAutoLaunchToggle = async (enabled: boolean) => {
    try {
      setIsLoading(true);
      if (window.electronAPI) {
        const newStatus = await window.electronAPI.setAutoLaunch(enabled);
        setIsAutoLaunchEnabled(newStatus);
        toast.success(
          newStatus
            ? "Auto-launch enabled - ToolHive will start with your system"
            : "Auto-launch disabled",
        );
      }
    } catch (error) {
      console.error("Failed to update auto-launch setting:", error);
      toast.error("Failed to update auto-launch setting");
      setIsAutoLaunchEnabled(!enabled);
    } finally {
      setIsLoading(false);
    }
  };

  if (typeof window === "undefined" || !window.electronAPI) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="auto-launch"
        checked={isAutoLaunchEnabled}
        onCheckedChange={handleAutoLaunchToggle}
        disabled={isLoading}
      />
      <Label htmlFor="auto-launch" className="text-sm">
        Start with system
      </Label>
    </div>
  );
}
