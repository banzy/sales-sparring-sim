import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { useAppStore } from "@/store";

const APP_NAME = "Sales Sparring Agent";

function formatScenarioIdAsProjectName(scenarioId?: string) {
  if (!scenarioId) return null;
  return scenarioId.replace("demo-", "").replace("scenario_", "");
}

export function DashboardLayout() {
  const { contextSetup } = useAppStore();
  const activeProjectName =
    contextSetup.clientName?.trim() ||
    formatScenarioIdAsProjectName(contextSetup.scenarioId) ||
    "No active project";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border bg-background px-5 sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <div className="min-w-0 flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground truncate">
                {activeProjectName}
              </span>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
