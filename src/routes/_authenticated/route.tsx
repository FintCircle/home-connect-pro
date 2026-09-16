import { createFileRoute, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

import { useAuthUser } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: user, isLoading } = useAuthUser();

  useEffect(() => {
    if (!isLoading && !user) {
      void router.navigate({
        to: "/auth",
        search: { redirect: pathname },
        replace: true,
      });
    }
  }, [isLoading, pathname, router, user]);

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">Checking your account…</p>
      </main>
    );
  }

  return <Outlet />;
}
