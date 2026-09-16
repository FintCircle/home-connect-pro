import { supabase } from "@/integrations/supabase/client";
import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Menu } from "lucide-react";
import { useState } from "react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5.5 10.5V20h13v-9.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="leading-none">
        <span className="block font-display text-lg font-bold text-primary">Pangisa</span>
        <span className="block text-[0.65rem] text-muted-foreground">Rent direct. Live better.</span>
      </span>
    </Link>
  );
}

const menu = [
  { to: "/", label: "Home" },
  { to: "/browse", label: "Find a home" },
  { to: "/list-property", label: "List your property" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/affiliates", label: "Funa Sente (referrals)" },
  { to: "/account", label: "Account" },
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
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open menu"
              className="grid size-9 place-items-center rounded-full hover:bg-muted"
            >
              <Menu className="size-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85%] max-w-xs p-0">
            <div className="border-b border-border p-5">
              <Logo />
            </div>
            <nav className="flex flex-col p-3">
              {menu.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="p-4">
              {user ? (
                <Button variant="outline" className="w-full" onClick={signOut}>
                  Sign out
                </Button>
              ) : (
                <Button asChild className="w-full">
                  <Link to="/auth" onClick={() => setOpen(false)}>
                    Sign in or create account
                  </Link>
                </Button>
              )}
            </div>
            <div className="mt-auto bg-primary-soft p-5 text-sm text-primary">
              <p className="font-display font-semibold">Uganda</p>
              <p className="text-xs opacity-80">Better rentals. Happier homes.</p>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
