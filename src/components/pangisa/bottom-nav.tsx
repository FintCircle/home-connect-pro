import { Link } from "@tanstack/react-router";
import { Home, Search, LayoutGrid, User } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/homes", label: "Find", icon: Search },
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/account", label: "Account", icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex flex-col items-center gap-1 py-2.5 text-[0.68rem] text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary font-medium" }}
            >
              <Icon className="size-5" strokeWidth={1.9} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
