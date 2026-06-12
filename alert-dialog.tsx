import { Upload, BookOpen, Library, NotebookPen } from "lucide-react";
import { Link, useLocation } from "wouter";
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
} from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const navItems = [
  { title: "Import", url: "/", icon: Upload },
  { title: "Catalogue", url: "/catalogue", icon: BookOpen },
  { title: "Library", url: "/library", icon: Library },
  { title: "Journal", url: "/journal", icon: NotebookPen },
];

export function AppSidebar() {
  const [location] = useLocation();

  const { data: stats } = useQuery<{
    total: number;
    completed: number;
    starred: number;
    inProgress: number;
  }>({
    queryKey: ["/api/stats"],
    queryFn: () => apiRequest("GET", "/api/stats").then((r) => r.json()),
    refetchInterval: 5000,
  });

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            aria-label="HBS Case Catalogue"
          >
            <rect width="28" height="28" rx="6" fill="currentColor" className="text-primary" />
            <path
              d="M7 8h4v4h6V8h4v12h-4v-4H11v4H7V8z"
              fill="currentColor"
              className="text-primary-foreground"
            />
          </svg>
          <span className="font-bold text-sm tracking-tight">Case Catalogue</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    data-active={location === item.url}
                    className="data-[active=true]:bg-sidebar-accent"
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {stats && stats.total > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Progress</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-3 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Catalogued</span>
                  <span>
                    {stats.completed}/{stats.total}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((stats.completed / stats.total) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{stats.starred} starred</span>
                  <span>{stats.inProgress} in progress</span>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
