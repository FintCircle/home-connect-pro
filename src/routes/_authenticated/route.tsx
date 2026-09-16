import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuthUser } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    return undefined;
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { data: user, isLoading } = useAuthUser();
  if (!isLoading && !user) {
    throw redirect({ to: "/auth" });
  }
  return <Outlet />;
}
