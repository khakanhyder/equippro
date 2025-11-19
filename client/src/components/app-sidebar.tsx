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
import { useAuth, useLogout } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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
  const { user } = useAuth();
  const logout = useLogout();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
      toast({
        title: "Logged out",
        description: "You've been signed out successfully",
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get user initials for avatar
  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.username || "User";

  const displayEmail = user?.email || user?.username || "user@example.com";

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
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-accent-foreground truncate">{displayName}</p>
            <p className="text-xs text-sidebar-accent-foreground/60 truncate">{displayEmail}</p>
          </div>
          <button 
            className="p-2 hover-elevate rounded-md"
            data-testid="button-sign-out"
            onClick={handleLogout}
            disabled={logout.isPending}
          >
            <LogOut className="w-4 h-4 text-sidebar-accent-foreground/60" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
