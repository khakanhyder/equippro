import { Search, LayoutDashboard, Target, Package, User, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocation } from "wouter";

const menuItems = [
  {
    title: "Marketplace",
    subtitle: "Browse equipment",
    url: "/",
    icon: Search,
  },
  {
    title: "Dashboard",
    subtitle: "Track bids & offers",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Wishlist",
    subtitle: "Manage projects",
    url: "/wishlist",
    icon: Target,
  },
  {
    title: "Surplus",
    subtitle: "Sell your equipment",
    url: "/surplus",
    icon: Package,
  },
  {
    title: "Profile",
    subtitle: "Account settings",
    url: "/profile",
    icon: User,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">EP</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">Equipment Pro</h1>
            <p className="text-xs text-sidebar-foreground/70">Industrial Equipment Marketplace</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <div className="px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">Navigation</p>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                    <a href={item.url} className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <div className="flex flex-col">
                        <span className="font-medium">{item.title}</span>
                        <span className="text-xs text-sidebar-foreground/60">{item.subtitle}</span>
                      </div>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent">
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">U</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-accent-foreground truncate">Authenticated User</p>
            <p className="text-xs text-sidebar-accent-foreground/60 truncate">user@example.com</p>
          </div>
          <button 
            className="p-2 hover-elevate rounded-md"
            data-testid="button-sign-out"
            onClick={() => console.log('Sign out clicked')}
          >
            <LogOut className="w-4 h-4 text-sidebar-accent-foreground/60" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
