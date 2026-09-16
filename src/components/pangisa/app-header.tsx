import { supabase } from "@/integrations/supabase/client";
import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Menu } from "lucide-react";
import { useState } from "react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  { to: "/", label: "Home" },
  { to: "/browse", label: "Find a home" },
  { to: "/list-property", label: "List your property" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/affiliates", label: "Funa Sente (referrals)" },
  { to: "/account", label: "Account" },
] as const;

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
          <SheetContent side="right" className="flex w-[85%] max-w-sm flex-col bg-background p-0">
            <div className="border-b border-border px-6 py-7">
              <Logo />
            </div>
            <nav aria-label="Main navigation" className="px-6 py-7">
              <div className="flex flex-col gap-1">
                {menu.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-1 py-3 text-[1.05rem] font-medium tracking-[-0.01em] transition-colors hover:bg-muted hover:text-primary"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="mt-7 border-t border-border pt-5">
                <p className="px-1 pb-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  More about Pangisa
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {publicInformation.map((item) => (
                    <Link
                      key={item.page}
                      to="/info/$page"
                      params={{ page: item.page }}
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-1 py-2 text-sm leading-5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </nav>
            <div className="mt-auto border-t border-border px-6 py-5">
              <div className="rounded-2xl border border-border bg-card p-1 shadow-sm">
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
            </div>
            <div className="bg-primary-soft px-6 py-5 text-primary">
              <p className="font-display text-lg font-semibold">Uganda</p>
              <p className="text-sm opacity-80">Better rentals. Happier homes.</p>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
