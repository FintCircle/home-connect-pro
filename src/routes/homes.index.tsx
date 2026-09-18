import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { AppHeader } from "@/components/pangisa/app-header";
import { BottomNav } from "@/components/pangisa/bottom-nav";
import { LocationSearch } from "@/components/pangisa/location-search";
import { Skeleton } from "@/components/ui/skeleton";
import { childrenOf, useLocationCounts, useRegionsTree } from "@/lib/locations";

export const Route = createFileRoute("/homes/")({
  head: () => ({
    meta: [
      { title: "Find a home in Uganda — Pangisa rentals" },
      {
        name: "description",
        content:
          "Search any Ugandan town, district or neighbourhood and see rentals listed directly by landlords.",
      },
      { property: "og:title", content: "Find a home in Uganda — Pangisa rentals" },
      {
        property: "og:description",
        content: "Search any Ugandan town, district or neighbourhood for rentals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomesIndex,
});

function HomesIndex() {
  const { regions, data: rows, isLoading } = useRegionsTree();
  const { data: counts } = useLocationCounts();

  return (
    <div className="min-h-screen pb-20">
      <AppHeader title="Find a home" back />
      <main className="mx-auto max-w-2xl p-4">
        <h1 className="font-display text-2xl font-bold">Where do you want to live?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Type a place — Ntinda, Kira, Seeta — or pick a region below.
        </p>
        <div className="mt-4">
          <LocationSearch />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {isLoading
            ? [1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-24 w-full rounded-xl" />)
            : regions.map((region) => (
                <Link
                  key={region.id}
                  to="/homes/$"
                  params={{ _splat: region.full_path ?? region.slug }}
                  className="surface-card block p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-base font-semibold">{region.name}</h2>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {childrenOf(rows, region.id)
                      .slice(0, 4)
                      .map((child) => child.name)
                      .join(" · ") || "Coming soon"}
                  </p>
                  <p className="mt-2 text-xs font-medium text-primary">
                    {counts?.[region.id] ?? 0} rentals live
                  </p>
                </Link>
              ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
