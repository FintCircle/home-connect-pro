import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const PROPERTY_CARD_SELECT =
  "id, title, property_type, rent_ugx, bedrooms, bathrooms, parking_spaces, landlord_verified, has_units, units_available, created_at, locations(name, full_path), areas(name, slug, cities(name, slug)), property_images(url)";

export function useRegions() {
  return useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regions")
        .select("id, name, slug, cities(id, name, slug, sort_order)")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRegion(slug: string) {
  return useQuery({
    queryKey: ["region", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regions")
        .select("id, name, slug, cities(id, name, slug, sort_order)")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCity(slug: string) {
  return useQuery({
    queryKey: ["city", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("id, name, slug, regions(name, slug), areas(id, name, slug, sort_order)")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useArea(slug: string) {
  return useQuery({
    queryKey: ["area", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("areas")
        .select("id, name, slug, cities(name, slug, regions(name, slug))")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Live rental counts grouped by area id — used for the browse lists. */
export function useLiveCounts() {
  return useQuery({
    queryKey: ["live-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("area_id, areas(city_id, cities(region_id))")
        .eq("status", "live");
      if (error) throw error;
      const byArea: Record<string, number> = {};
      const byCity: Record<string, number> = {};
      const byRegion: Record<string, number> = {};
      for (const row of data ?? []) {
        const areaId = row.area_id as string;
        const cityId = row.areas?.city_id as string | undefined;
        const regionId = row.areas?.cities?.region_id as string | undefined;
        byArea[areaId] = (byArea[areaId] ?? 0) + 1;
        if (cityId) byCity[cityId] = (byCity[cityId] ?? 0) + 1;
        if (regionId) byRegion[regionId] = (byRegion[regionId] ?? 0) + 1;
      }
      return { byArea, byCity, byRegion };
    },
  });
}

export function useAreaListings(areaId: string | undefined) {
  return useQuery({
    queryKey: ["area-listings", areaId],
    enabled: Boolean(areaId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select(PROPERTY_CARD_SELECT)
        .eq("status", "live")
        .eq("area_id", areaId!)
        .order("landlord_verified", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProperty(propertyId: string) {
  return useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select(
          "*, locations(name, full_path), areas(name, slug, cities(name, slug, regions(name, slug))), property_images(url, sort_order)",
        )
        .eq("id", propertyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMyUnlock(propertyId: string, userId: string | undefined) {
  return useQuery({
    queryKey: ["unlock", propertyId, userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unlocks")
        .select("*")
        .eq("property_id", propertyId)
        .eq("tenant_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function usePropertyLocation(propertyId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["property-location", propertyId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_locations")
        .select("*")
        .eq("property_id", propertyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
