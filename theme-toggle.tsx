import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import ImportPage from "@/pages/import";
import UploadPage from "@/pages/upload";
import CataloguePage from "@/pages/catalogue";
import LibraryPage from "@/pages/library";
import JournalPage from "@/pages/journal";
import SessionPage from "@/pages/session";
import NotFound from "@/pages/not-found";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={ImportPage} />
      <Route path="/upload" component={UploadPage} />
      <Route path="/catalogue" component={CataloguePage} />
      <Route path="/library" component={LibraryPage} />
      <Route path="/journal" component={JournalPage} />
      <Route path="/sessions/:id" component={SessionPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router hook={useHashLocation}>
            <SidebarProvider style={style as React.CSSProperties}>
              <div className="flex h-screen w-full">
                <AppSidebar />
                <div className="flex flex-col flex-1 min-w-0">
                  <header className="flex items-center justify-between gap-2 px-4 py-2 border-b">
                    <div className="flex items-center gap-2">
                      <SidebarTrigger data-testid="button-sidebar-toggle" />
                      <span className="text-sm font-medium text-muted-foreground">
                        HBS Case Catalogue
                      </span>
                    </div>
                    <ThemeToggle />
                  </header>
                  <main className="flex-1 overflow-auto">
                    <AppRouter />
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </Router>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
