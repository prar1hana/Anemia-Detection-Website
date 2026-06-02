import { Link, useLocation } from "wouter";
import { Activity, History, LayoutDashboard, BarChart3, AlertCircle } from "lucide-react";
import { useHealthCheck } from "@workspace/api-client-react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { data: health, isError } = useHealthCheck();

  const navItems = [
    { href: "/", label: "Analysis Dashboard", icon: LayoutDashboard },
    { href: "/history", label: "Prediction History", icon: History },
    { href: "/stats", label: "Aggregate Stats", icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r bg-sidebar flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3 text-sidebar-primary">
            <Activity className="h-6 w-6" />
            <h1 className="font-semibold tracking-tight text-lg text-sidebar-foreground">TBD</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Anemia Screening System</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-card border text-sm">
            {isError ? (
              <>
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-destructive font-medium">System Offline</span>
              </>
            ) : health?.status === "ok" ? (
              <>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-muted-foreground">System Online</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <span className="text-muted-foreground">Connecting...</span>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
