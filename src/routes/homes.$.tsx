import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { AppHeader } from "@/components/pangisa/app-header";
import { BottomNav } from "@/components/pangisa/bottom-nav";
import { LocationSearch } from "@/components/pangisa/location-search";
import { PropertyCard } from "@/components/pangisa/property-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  childrenOf,
  pathLabel,
  useLocationByPath,
  useLocationCounts,
  useLocationListings,
  useLocationTree,
} from "@/lib/locations";
import { PROPERTY_TYPES } from "@/lib/uganda";

export const Route = createFileRoute("/homes/$")({
  head: ({ params }) => {
    const place = pathLabel((params as { _splat?: string })._splat ?? "", 2) || "Uganda";
    const title = `Rentals in ${place} — Pangisa`;
    const description = `Houses, apartments and rental units available in ${place}, listed directly by landlords.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: LocationHomes,
});

function LocationHomes() {
  const { _splat } = Route.useParams();
  const path = (_splat ?? "").replace(/^\/+|\/+$/g, "");
  const { data: location, isLoading: loadingPlace } = useLocationByPath(path);
  const { data: rows } = useLocationTree();
  const { data: counts } = useLocationCounts();
  const { data: listings, isLoading } = useLocationListings(location?.id);

  const [sort, setSort] = useState("recommended");
  const [beds, setBeds] = useState("any");
  const [type, setType] = useState("any");

  const children = childrenOf(rows, location?.id ?? null).filter((row) => row.is_active);

  const trail = useMemo(() => {
    const segments = path.split("/").filter(Boolean);
    return segments.map((segment, index) => ({
      path: segments.slice(0, index + 1).join("/"),
      name: pathLabel(segment, 1),
    }));
  }, [path]);

  const visible = useMemo(() => {
    let items = (listings ?? []).slice();
    if (beds !== "any") items = items.filter((row) => row.bedrooms >= Number(beds));
    if (type !== "any") items = items.filter((row) => row.property_type === type);
    if (sort === "cheapest") items.sort((a, b) => a.rent_ugx - b.rent_ugx);
    if (sort === "priciest") items.sort((a, b) => b.rent_ugx - a.rent_ugx);
    return items;
  }, [listings, beds, type, sort]);

  if (!loadingPlace && !location) {
    return (
      <div className="min-h-screen pb-20">
        <AppHeader title="Place not found" back />
        <main className="mx-auto max-w-lg space-y-4 p-4">
          <div className="surface-card p-6 text-sm text-muted-foreground">
            We don&apos;t have that place yet. Search for another one below.
          </div>
          <LocationSearch />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <AppHeader title={location?.name ?? "Rentals"} back />
      <main className="mx-auto max-w-2xl p-4">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Link to="/homes" className="hover:text-foreground">
            Uganda
          </Link>
          {trail.map((crumb) => (
            <span key={crumb.path} className="flex items-center gap-1">
              <ChevronRight className="size-3" />
              <Link
                to="/homes/$"
                params={{ _splat: crumb.path }}
                className="hover:text-foreground"
              >
                {crumb.name}
              </Link>
            </span>
          ))}
        </nav>

        <h1 className="mt-2 font-display text-2xl font-bold">
          Rentals in {location?.name ?? "this place"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {visible.length} live {visible.length === 1 ? "rental" : "rentals"} here and in the areas
          inside it.
        </p>

        <div className="mt-4">
          <LocationSearch placeholder="Jump to another place" />
        </div>

        {children.length ? (
          <div className="mt-5">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Places inside {location?.name}
            </h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {children.map((child) => (
                <Link
                  key={child.id}
                  to="/homes/$"
                  params={{ _splat: child.full_path ?? "" }}
                  className="surface-card flex items-center gap-3 p-3.5"
                >
                  <span className="flex-1">
                    <span className="block font-display text-[0.95rem] font-semibold">
                      {child.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {counts?.[child.id] ?? 0} rentals
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
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

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {isLoading ? (
            [1, 2, 3].map((n) => <Skeleton key={n} className="h-72 w-full rounded-xl" />)
          ) : visible.length === 0 ? (
            <div className="surface-card p-6 text-center text-sm text-muted-foreground sm:col-span-2">
              No live rentals here yet. Try a nearby place, or list your own property.
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
