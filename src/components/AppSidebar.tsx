import { Settings, Crosshair, FileText, Swords, BarChart3 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Context Setup", url: "/", icon: Settings },
  { title: "Briefing & Materials", url: "/briefing", icon: FileText },
  { title: "Sparring Arena", url: "/arena", icon: Swords },
  { title: "Performance & History", url: "/performance", icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Crosshair className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-accent-foreground tracking-tight">
                Sales Sparring
              </span>
              <span className="text-[11px] text-sidebar-foreground">Adaptive Agent</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50">
            Workflow
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item, idx) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent/60 transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center">
                          <span className="mr-1 text-[10px] font-mono text-sidebar-foreground/40">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <item.icon className="h-4 w-4" />
                        </div>
                        {!collapsed && <span>{item.title}</span>}
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-3">
        {!collapsed && (
          <p className="text-[10px] text-sidebar-foreground/40 font-mono">v1.0 · Adaptive Engine</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
