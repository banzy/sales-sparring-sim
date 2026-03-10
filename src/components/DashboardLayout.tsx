import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { resolveProjectName } from "@/lib/projects";
import { useAppStore } from "@/store";
import { LcdClock } from "@/components/LcdClock";

const APP_NAME = "Sales Sparring Agent";

export function DashboardLayout() {
  const { contextSetup } = useAppStore();
  const activeProjectName = contextSetup.scenarioId
    ? resolveProjectName({
      scenarioId: contextSetup.scenarioId,
      clientName: contextSetup.clientName,
    })
    : "No active project";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-background px-5 sticky top-0 z-10">
            <div className="flex items-center">
              <SidebarTrigger className="mr-4" />
              <div className="min-w-0 flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-sm text-muted-foreground truncate">
                  {activeProjectName}
                </span>
              </div>
            </div>
            <LcdClock />
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
