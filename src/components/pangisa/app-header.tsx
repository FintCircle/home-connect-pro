import { supabase } from "@/integrations/supabase/client";
import { Link, useRouter } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  Gift,
  Home,
  Info,
  LayoutDashboard,
  Menu,
  Search,
  ShieldCheck,
  UserRound,
  FileText,
} from "lucide-react";
import { useState } from "react";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import logoPin from "@/assets/logo-pin.png";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <img src={logoPin} alt="Pangisa" className="size-9 object-contain" />
      <span className="leading-none">
        <span className="block font-display text-lg font-bold text-primary">Pangisa</span>
        <span className="block text-[0.65rem] text-muted-foreground">Rent direct. Live better.</span>
      </span>
    </Link>
  );
}

const menu = [
  { to: "/", label: "Home", icon: Home, tone: "bg-emerald-50 text-emerald-700" },
  { to: "/browse", label: "Find a home", icon: Search, tone: "bg-sky-50 text-sky-700" },
  { to: "/list-property", label: "List your property", icon: Building2, tone: "bg-amber-50 text-amber-700" },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, tone: "bg-violet-50 text-violet-700" },
  { to: "/affiliates", label: "Funa Sente", icon: Gift, tone: "bg-rose-50 text-rose-700" },
  { to: "/account", label: "Account", icon: UserRound, tone: "bg-slate-100 text-slate-700" },
] as const;

const informationIcons = { about: Info, terms: FileText, privacy: ShieldCheck, disclaimer: AlertTriangle } as const;

const publicInformation = [
  { page: "about", label: "About Pangisa" },
  { page: "terms", label: "Terms of Service" },
  { page: "privacy", label: "Privacy Policy" },
  { page: "disclaimer", label: "Disclaimer" },
] as const;

export function AppHeader({ title, back }: { title?: string; back?: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data: user } = useAuthUser();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    setOpen(false);
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
        {back ? (
          <button
            type="button"
            onClick={() => router.history.back()}
            aria-label="Go back"
            className="grid size-9 place-items-center rounded-full text-foreground hover:bg-muted"
          >
            <ChevronLeft className="size-5" />
          </button>
        ) : null}
        {title ? (
          <h1 className="flex-1 truncate text-center font-display text-base font-semibold">
            {title}
          </h1>
        ) : (
          <div className="flex-1">
            <Logo />
          </div>
        )}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <button
              type="button"
              aria-label="Open menu"
              className="grid size-9 place-items-center rounded-full transition-colors hover:bg-muted"
            >
              <Menu className="size-5" />
            </button>
          </DrawerTrigger>
          <DrawerContent className="mx-auto max-h-[92vh] max-w-lg overflow-y-auto rounded-t-[2rem] border-border bg-background pb-0">
            <DrawerHeader className="border-b border-border px-6 pb-5 pt-3 text-left">
              <DrawerTitle className="sr-only">Pangisa menu</DrawerTitle>
              <DrawerDescription className="sr-only">Navigate Pangisa</DrawerDescription>
              <Logo />
            </DrawerHeader>
            <nav aria-label="Main navigation" className="px-5 py-5">
              <div className="grid grid-cols-2 gap-3">
                {menu.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="group flex min-h-24 flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                    >
                      <span className={`grid size-9 place-items-center rounded-xl ${item.tone}`}>
                        <Icon aria-hidden="true" />
                      </span>
                      <span className="text-sm font-semibold leading-tight text-foreground group-hover:text-primary">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
              <div className="mt-7 border-t border-border pt-5">
                <p className="px-1 pb-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  More about Pangisa
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {publicInformation.map((item) => {
                    const Icon = informationIcons[item.page];
                    return (
                      <Link
                        key={item.page}
                        to="/info/$page"
                        params={{ page: item.page }}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-2 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Icon aria-hidden="true" className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </nav>
            <div className="mt-auto border-t border-border px-5 py-4">
              {user ? (
                <Button variant="outline" className="w-full rounded-xl" onClick={signOut}>
                  Sign out
                </Button>
              ) : (
                <Button asChild className="w-full rounded-xl">
                  <Link to="/auth" onClick={() => setOpen(false)}>
                    Sign in or create account
                  </Link>
                </Button>
              )}
            </div>
            <div className="bg-primary-soft px-6 py-5 text-primary">
              <p className="font-display text-lg font-semibold">Uganda</p>
              <p className="text-sm opacity-80">Better rentals. Happier homes.</p>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </header>
  );
}
