import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border bg-background/80 backdrop-blur-sm px-5 sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
          </header>
          <main className="flex-1 overflow-auto dot-pattern">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
