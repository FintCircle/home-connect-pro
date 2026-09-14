import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Search } from "lucide-react";
import { useState } from "react";

import { AppHeader } from "@/components/pangisa/app-header";
import { BottomNav } from "@/components/pangisa/bottom-nav";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCity, useLiveCounts } from "@/lib/queries";

export const Route = createFileRoute("/browse/$regionSlug/$citySlug")({
  head: () => ({
    meta: [
      { title: "Choose an area — Pangisa rentals" },
      {
        name: "description",
        content: "Pick a neighbourhood or area to see the rentals available there.",
      },
      { property: "og:title", content: "Choose an area — Pangisa rentals" },
      {
        property: "og:description",
        content: "Pick a neighbourhood or area to see the rentals available there.",
      },
    ],
  }),
  component: CityAreas,
});

function CityAreas() {
  const { citySlug } = Route.useParams();
  const { data: city, isLoading } = useCity(citySlug);
  const { data: counts } = useLiveCounts();
  const [term, setTerm] = useState("");

  const areas = (city?.areas ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter((area) => area.name.toLowerCase().includes(term.trim().toLowerCase()));

  return (
    <div className="min-h-screen pb-20">
      <AppHeader title={city?.name ?? "City"} back />
      <main className="mx-auto max-w-lg p-4">
        <h2 className="font-display text-2xl font-bold">Choose a district or area</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Find rentals in {city?.name ?? "this city"}.
        </p>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search area (e.g. Kisaasi)"
            className="pl-9"
          />
        </div>

        <div className="mt-4 space-y-2">
          {isLoading
            ? [1, 2, 3, 4, 5].map((n) => <Skeleton key={n} className="h-16 w-full rounded-xl" />)
            : areas.map((area) => (
                <Link
                  key={area.id}
                  to="/rentals/$areaSlug"
                  params={{ areaSlug: area.slug }}
                  className="surface-card flex items-center gap-3 p-3.5"
                >
                  <span className="flex-1">
                    <span className="block font-display text-[0.95rem] font-semibold">
                      {area.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {counts?.byArea[area.id] ?? 0} rentals
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
