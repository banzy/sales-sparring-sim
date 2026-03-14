import {
  Settings,
  FolderOpen,
  FileText,
  Swords,
  BarChart3,
  ClockIcon,
  Sliders,
} from 'lucide-react';
import ssaLogo from '@/assets/ssa.png';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
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
} from '@/components/ui/sidebar';

const navItems = [
  { title: 'Context Setup', url: '/', icon: Settings },
  { title: 'Projects', url: '/projects', icon: FolderOpen },
  { title: 'Briefing & Materials', url: '/briefing', icon: FileText },
  { title: 'Sparring Arena', url: '/arena', icon: Swords },
  { title: 'Performance', url: '/performance', icon: BarChart3 },
  { title: "Session's History", url: '/history', icon: ClockIcon },
  { title: 'Settings', url: '/settings', icon: Sliders },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-5 bg-white">
        <div className="flex items-center gap-3">
          <img src={ssaLogo} alt="Ciklum" className="h-10 object-contain" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 px-4 mb-1">
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
                      className="rounded-xl hover:bg-sidebar-accent transition-colors px-3 py-2.5"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.35),_0_1px_2px_rgba(15,23,42,0.18)]"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        {!collapsed && (
                          <span className="text-sm">{item.title}</span>
                        )}
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-4">
        {!collapsed && (
          <p className="text-[10px] text-muted-foreground/50 font-mono">
            v1.0 · Adaptive Engine
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
