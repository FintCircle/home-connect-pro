import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppHeader } from "@/components/pangisa/app-header";
import { BottomNav } from "@/components/pangisa/bottom-nav";
import { PropertyCard } from "@/components/pangisa/property-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useArea, useAreaListings } from "@/lib/queries";
import { PROPERTY_TYPES } from "@/lib/uganda";

export const Route = createFileRoute("/rentals/$areaSlug")({
  head: () => ({
    meta: [
      { title: "Rentals in this area — Pangisa" },
      {
        name: "description",
        content:
          "Houses, apartments and rental units available now, listed directly by landlords.",
      },
      { property: "og:title", content: "Rentals in this area — Pangisa" },
      {
        property: "og:description",
        content: "Houses, apartments and rental units listed directly by landlords.",
      },
    ],
  }),
  component: AreaListings,
});

function AreaListings() {
  const { areaSlug } = Route.useParams();
  const { data: area } = useArea(areaSlug);
  const { data: listings, isLoading } = useAreaListings(area?.id);
  const [sort, setSort] = useState("recommended");
  const [beds, setBeds] = useState("any");
  const [type, setType] = useState("any");

  const visible = useMemo(() => {
    let rows = (listings ?? []).slice();
    if (beds !== "any") rows = rows.filter((r) => r.bedrooms >= Number(beds));
    if (type !== "any") rows = rows.filter((r) => r.property_type === type);
    if (sort === "cheapest") rows.sort((a, b) => a.rent_ugx - b.rent_ugx);
    if (sort === "priciest") rows.sort((a, b) => b.rent_ugx - a.rent_ugx);
    return rows;
  }, [listings, beds, type, sort]);

  return (
    <div className="min-h-screen pb-20">
      <AppHeader title={area?.name ?? "Rentals"} back />
      <main className="mx-auto max-w-lg p-4">
        <p className="text-xs text-muted-foreground">
          {area?.cities?.name} · {area?.cities?.regions?.name}
        </p>
        <h2 className="mt-1 font-display text-xl font-bold">
          {visible.length} rentals in {area?.name ?? "this area"}
        </h2>

        <div className="mt-3 flex flex-wrap gap-2">
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-9 w-auto rounded-full text-xs">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recommended">Verified first</SelectItem>
              <SelectItem value="cheapest">Lowest rent</SelectItem>
              <SelectItem value="priciest">Highest rent</SelectItem>
            </SelectContent>
          </Select>
          <Select value={beds} onValueChange={setBeds}>
            <SelectTrigger className="h-9 w-auto rounded-full text-xs">
              <SelectValue placeholder="Bedrooms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any bedrooms</SelectItem>
              <SelectItem value="1">1+ bedroom</SelectItem>
              <SelectItem value="2">2+ bedrooms</SelectItem>
              <SelectItem value="3">3+ bedrooms</SelectItem>
              <SelectItem value="4">4+ bedrooms</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9 w-auto rounded-full text-xs">
              <SelectValue placeholder="Property type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any type</SelectItem>
              {PROPERTY_TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 space-y-4">
          {isLoading ? (
            [1, 2, 3].map((n) => <Skeleton key={n} className="h-72 w-full rounded-xl" />)
          ) : visible.length === 0 ? (
            <div className="surface-card p-6 text-center text-sm text-muted-foreground">
              No live rentals here yet. Check another area, or list your own property.
            </div>
          ) : (
            visible.map((property) => <PropertyCard key={property.id} property={property} />)
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
