import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Search } from "lucide-react";
import { useState } from "react";

import { AppHeader } from "@/components/pangisa/app-header";
import { BottomNav } from "@/components/pangisa/bottom-nav";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveCounts, useRegion } from "@/lib/queries";

export const Route = createFileRoute("/browse/$regionSlug")({
  head: () => ({
    meta: [
      { title: "Choose a city or district — Pangisa" },
      {
        name: "description",
        content: "Pick a city or district to see rentals available there on Pangisa.",
      },
      { property: "og:title", content: "Choose a city or district — Pangisa" },
      {
        property: "og:description",
        content: "Pick a city or district to see rentals available there on Pangisa.",
      },
    ],
  }),
  component: RegionCities,
});

function RegionCities() {
  const { regionSlug } = Route.useParams();
  const { data: region, isLoading } = useRegion(regionSlug);
  const { data: counts } = useLiveCounts();
  const [term, setTerm] = useState("");

  const cities = (region?.cities ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter((city) => city.name.toLowerCase().includes(term.trim().toLowerCase()));

  return (
    <div className="min-h-screen pb-20">
      <AppHeader title={region?.name ?? "Region"} back />
      <main className="mx-auto max-w-lg p-4">
        <h2 className="font-display text-2xl font-bold">Choose a city or district</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Popular cities and districts in {region?.name ?? "this region"}.
        </p>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search city or district"
            className="pl-9"
          />
        </div>

        <div className="mt-4 space-y-2">
          {isLoading
            ? [1, 2, 3, 4, 5].map((n) => <Skeleton key={n} className="h-16 w-full rounded-xl" />)
            : cities.map((city) => (
                <Link
                  key={city.id}
                  to="/browse/$regionSlug/$citySlug"
                  params={{ regionSlug, citySlug: city.slug }}
                  className="surface-card flex items-center gap-3 p-3.5"
                >
                  <span className="flex-1">
                    <span className="block font-display text-[0.95rem] font-semibold">
                      {city.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {counts?.byCity[city.id] ?? 0} rentals
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
