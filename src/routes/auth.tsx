import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AppHeader } from "@/components/pangisa/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  validateSearch: (search) =>
    z
      .object({ redirect: z.string().optional(), ref: z.string().optional() })
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
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [referral, setReferral] = useState("");
  const [busy, setBusy] = useState(false);
  const next = safePath(search.redirect);

  useEffect(() => {
    const stored =
      search.ref ?? (typeof window !== "undefined" ? localStorage.getItem("pangisa_ref") : null);
    if (stored) setReferral(stored);
  }, [search.ref]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.navigate({ to: next, replace: true });
    });
  }, [next, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + next,
            data: {
              full_name: fullName,
              phone,
              referral_code: referral.trim() || null,
            },
          },
        });
        if (error) throw error;
        toast.success("Account created. Check your email to confirm, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.navigate({ to: next, replace: true });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth" + (search.redirect ? `?redirect=${encodeURIComponent(next)}` : ""),
    });
    if (result.error) {
      toast.error("Google sign-in failed. Try again.");
      return;
    }
    if (result.redirected) return;
    router.navigate({ to: next, replace: true });
  }

  return (
    <div className="min-h-screen">
      <AppHeader title={mode === "signin" ? "Sign in" : "Create account"} back />
      <main className="mx-auto max-w-lg p-5">
        <h1 className="font-display text-2xl font-bold">
          {mode === "signin" ? "Welcome back" : "Join Pangisa"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One account for renting, listing and earning referrals.
        </p>

        <Button variant="outline" className="mt-5 w-full" onClick={google}>
          Continue with Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or use email{" "}
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  inputMode="tel"
                  placeholder="07xx xxx xxx"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                />
              </div>
            </>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {mode === "signup" ? (
            <div className="space-y-1.5">
              <Label htmlFor="referral">Referral code (optional)</Label>
              <Input
                id="referral"
                placeholder="Pan1234"
                value={referral}
                onChange={(event) => setReferral(event.target.value)}
              />
            </div>
          ) : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 w-full text-sm text-primary underline"
        >
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </main>
    </div>
  );
}
