import { createFileRoute } from "@tanstack/react-router";
import { SignIn, SignUp } from "@clerk/tanstack-react-start";
import { z } from "zod";

import { AppHeader } from "@/components/pangisa/app-header";

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

  return (
    <div className="min-h-screen">
      <AppHeader title="Sign in or create account" back />
      <main className="mx-auto flex max-w-lg justify-center p-5">
        {search.mode === "signup" ? (
          <SignUp routing="hash" fallbackRedirectUrl={redirectUrl} signInUrl="/auth" />
        ) : (
          <SignIn routing="hash" fallbackRedirectUrl={redirectUrl} signUpUrl="/auth?mode=signup" />
        )}
      </main>
    </div>
  );
}
