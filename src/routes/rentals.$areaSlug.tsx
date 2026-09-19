import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { AppHeader } from "@/components/pangisa/app-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocationBySlug } from "@/lib/locations";

/** Old area URL — finds the matching place and sends the visitor to its new page. */
export const Route = createFileRoute("/rentals/$areaSlug")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: LegacyAreaRedirect,
});

function LegacyAreaRedirect() {
  const { areaSlug } = Route.useParams();
  const navigate = useNavigate();
  const { data: location, isLoading } = useLocationBySlug(areaSlug);

  useEffect(() => {
    if (isLoading) return;
    if (location?.full_path) {
      void navigate({ to: "/homes/$", params: { _splat: location.full_path }, replace: true });
    } else {
      void navigate({ to: "/homes", replace: true });
    }
  }, [isLoading, location, navigate]);

  return (
    <div className="min-h-screen">
      <AppHeader title="Rentals" back />
      <div className="mx-auto max-w-lg p-4">
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
