import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { PROPERTY_CARD_SELECT } from "@/lib/queries";

export type LocationRow = {
  id: string;
  name: string;
  slug: string;
  type: string;
  parent_id: string | null;
  full_path: string | null;
  is_active: boolean;
  sort_order: number;
};

const LOCATION_SELECT = "id, name, slug, type, parent_id, full_path, is_active, sort_order";

/** Friendly label for a place, e.g. "Ntinda, Nakawa, Kampala". */
export function pathLabel(fullPath: string | null | undefined, depth = 3) {
  if (!fullPath) return "";
  const segments = fullPath.split("/");
  return segments
    .slice(-depth)
    .reverse()
    .map((segment) =>
      segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    )
    .join(", ");
}

/** Every active place — small enough (a few hundred rows) to hold client-side. */
export function useLocationTree() {
  return useQuery({
    queryKey: ["locations", "tree"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select(LOCATION_SELECT)
        .eq("is_active", true)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data ?? []) as LocationRow[];
    },
  });
}

/** Every place including disabled ones — admin only (RLS enforces it). */
export function useAllLocations(enabled = true) {
  return useQuery({
    queryKey: ["locations", "all"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select(LOCATION_SELECT)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data ?? []) as LocationRow[];
    },
  });
}

export function childrenOf(rows: LocationRow[] | undefined, parentId: string | null) {
  return (rows ?? [])
    .filter((row) => row.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

export function descendantIds(rows: LocationRow[] | undefined, rootId: string): string[] {
  const all = rows ?? [];
  const out = [rootId];
  let frontier = [rootId];
  while (frontier.length) {
    const next = all.filter((row) => row.parent_id && frontier.includes(row.parent_id));
    frontier = next.map((row) => row.id);
    out.push(...frontier);
  }
  return out;
}

/** The country root and its regions. */
export function useRegionsTree() {
  const tree = useLocationTree();
  const country = (tree.data ?? []).find((row) => row.type === "country") ?? null;
  const regions = childrenOf(tree.data, country?.id ?? null).filter(
    (row) => row.type === "region",
  );
  return { ...tree, country, regions };
}

export function useLocationByPath(path: string) {
  return useQuery({
    queryKey: ["location", "path", path],
    enabled: Boolean(path),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select(LOCATION_SELECT)
        .eq("full_path", path)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as LocationRow | null;
    },
  });
}

export function useLocationBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["location", "slug", slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select(LOCATION_SELECT)
        .eq("slug", slug!)
        .eq("is_active", true)
        .order("sort_order")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as LocationRow | null;
    },
  });
}

export function useLocationSearch(term: string) {
  const trimmed = term.trim();
  return useQuery({
    queryKey: ["locations", "search", trimmed],
    enabled: trimmed.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_locations", {
        _term: trimmed,
        _limit: 12,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Live listings in a place and everything beneath it. */
export function useLocationListings(locationId: string | undefined) {
  const tree = useLocationTree();
  const ids = locationId && tree.data ? descendantIds(tree.data, locationId) : [];
  return useQuery({
    queryKey: ["location-listings", locationId, ids.length],
    enabled: Boolean(locationId) && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select(PROPERTY_CARD_SELECT)
        .eq("status", "live")
        .in("location_id", ids)
        .order("landlord_verified", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Live rental counts per place, each including its descendants. */
export function useLocationCounts() {
  const tree = useLocationTree();
  return useQuery({
    queryKey: ["location-counts", tree.data?.length ?? 0],
    enabled: Boolean(tree.data),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("location_id")
        .eq("status", "live");
      if (error) throw error;
      const rows = tree.data ?? [];
      const direct: Record<string, number> = {};
      for (const row of data ?? []) {
        const id = row.location_id;
        if (id) direct[id] = (direct[id] ?? 0) + 1;
      }
      const parentOf = new Map(rows.map((row) => [row.id, row.parent_id]));
      const total: Record<string, number> = {};
      for (const [id, count] of Object.entries(direct)) {
        let current: string | null | undefined = id;
        const seen = new Set<string>();
        while (current && !seen.has(current)) {
          seen.add(current);
          total[current] = (total[current] ?? 0) + count;
          current = parentOf.get(current) ?? null;
        }
      }
      return total;
    },
  });
}

export function useMySuggestions(enabled: boolean) {
  return useQuery({
    queryKey: ["location-suggestions"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("location_suggestions")
        .select("id, raw_name, note, status, parent_location_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
