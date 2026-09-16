import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { AppHeader } from "@/components/pangisa/app-header";
import { BottomNav } from "@/components/pangisa/bottom-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveCounts, useRegions } from "@/lib/queries";

export const Route = createFileRoute("/browse/")({
  head: () => ({
    meta: [
      { title: "Choose a region — Pangisa rentals in Uganda" },
      {
        name: "description",
        content:
          "Pick a region of Uganda to find rentals in its cities, districts and neighbourhoods.",
      },
      { property: "og:title", content: "Choose a region — Pangisa rentals in Uganda" },
      {
        property: "og:description",
        content: "Pick a region of Uganda to find rentals in its cities and districts.",
      },
    ],
  }),
  component: BrowseRegions,
});

function BrowseRegions() {
  const { data: regions, isLoading, isError } = useRegions();
  const { data: counts } = useLiveCounts();

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <AppHeader title="Pangisa" back />
      <main className="mx-auto max-w-6xl p-4 md:px-8 md:py-10">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-bold md:text-4xl">Choose a region</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a region to find rentals in its cities and districts.
        </p>

        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 md:mt-10 md:grid-cols-3">
          {isLoading ? (
            [1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-24 w-full rounded-xl" />)
          ) : isError ? (
            <div className="surface-card p-5 text-sm text-muted-foreground">
              We couldn&apos;t load regions right now. Please refresh and try again.
            </div>
          ) : regions?.length ? (
            regions.map((region) => (
                <Link
                  key={region.id}
                  to="/browse/$regionSlug"
                  params={{ regionSlug: region.slug }}
                  className="surface-card block p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-base font-semibold">{region.name}</h3>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(region.cities ?? [])
                      .slice(0, 4)
                      .map((c) => c.name)
                      .join(" · ")}
                    {(region.cities ?? []).length > 4 ? " · + more" : ""}
                  </p>
                  <p className="mt-2 text-xs font-medium text-primary">
                    {counts?.byRegion[region.id] ?? 0} rentals live
                  </p>
                </Link>
              ))
          ) : (
            <div className="surface-card p-5 text-sm text-muted-foreground">
              No regions are available yet.
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
