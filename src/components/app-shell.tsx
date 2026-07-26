import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { BarChart3, Facebook, Globe2, Instagram, LayoutDashboard, ShoppingBag, Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlobalFilter } from "./global-filter";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/meta-ads", label: "Meta Ads", icon: Target },
  { to: "/google-ads", label: "Google Ads", icon: BarChart3 },
  { to: "/google-analytics", label: "Google Analytics", icon: Globe2 },
  { to: "/facebook", label: "Facebook Insights", icon: Facebook },
  { to: "/instagram", label: "Instagram Insights", icon: Instagram },
  { to: "/olx", label: "OLX", icon: ShoppingBag },
] as const;

export function AppShell({ children, title, actions }: { children: ReactNode; title: string; actions?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary font-bold text-primary-foreground">R</div>
          <div>
            <div className="text-sm font-semibold leading-tight">Radiocom</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Analytics Hub</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {NAV.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> Live from Google Sheets
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/80 px-6 py-3 backdrop-blur">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <GlobalFilter />
            {actions}
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
