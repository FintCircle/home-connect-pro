import { createFileRoute, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";

import { useAuthUser } from "@/hooks/use-auth";

import { AppHeader } from "@/components/pangisa/app-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  validateSearch: (search) =>
    z
      .object({ redirect: z.string().optional(), ref: z.string().optional(), mode: z.enum(["signin", "signup"]).optional() })
      .parse(search),
  head: () => ({
    meta: [
      { title: "Sign in — Pangisa" },
      {
        name: "description",
        content: "Sign in or create your free Pangisa account to list a property or rent a home.",
      },
      { property: "og:title", content: "Sign in — Pangisa" },
      {
        property: "og:description",
        content: "One Pangisa account for renting, listing and earning referrals.",
      },
    ],
  }),
  component: AuthPage,
});

function safePath(path: string | undefined) {
  return path && path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

function AuthPage() {
  const search = Route.useSearch();
  const redirectUrl = safePath(search.redirect);
  const router = useRouter();
  const { data: user } = useAuthUser();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) void router.navigate({ to: redirectUrl, replace: true });
  }, [user, redirectUrl, router]);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(redirectUrl)}`,
      },
    });
    if (authError) {
      setError("Google sign-in is unavailable right now. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="Sign in or create account" back />
      <main className="mx-auto flex max-w-lg justify-center p-5">
        <section className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-2xl font-bold">Welcome to Pangisa</h2>
          <p className="mt-2 text-sm text-muted-foreground">Use your Google account to rent, list, and earn referrals.</p>
          <Button className="mt-6 w-full" onClick={signInWithGoogle} disabled={loading}>
            {loading ? "Connecting…" : "Continue with Google"}
          </Button>
          {error ? <p className="mt-3 text-sm text-destructive" role="alert">{error}</p> : null}
        </section>
      </main>
    </div>
  );
}
