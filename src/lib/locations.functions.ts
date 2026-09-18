import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LOCATION_TYPES = [
  "country",
  "region",
  "district",
  "city",
  "municipality",
  "town",
  "division",
  "area",
  "neighborhood",
  "village",
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type Ctx = { supabase: any; userId: string };

async function assertAdmin(context: Ctx) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only admins can manage locations");
}

async function subtreeIds(context: Ctx, id: string): Promise<string[]> {
  const { data, error } = await context.supabase.rpc("location_descendants", { _id: id });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: { id: string }) => row.id);
}

export const saveLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(120),
        slug: z.string().max(140).optional(),
        type: z.enum(LOCATION_TYPES),
        parentId: z.string().uuid().nullable().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
        latitude: z.number().nullable().optional(),
        longitude: z.number().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const slug = slugify(data.slug?.trim() || data.name);
    if (!slug) throw new Error("That name cannot be turned into a web address");

    if (data.id && data.parentId) {
      const family = await subtreeIds(context as Ctx, data.id);
      if (family.includes(data.parentId)) {
        throw new Error("A place cannot be moved inside itself");
      }
    }

    // Inherit the region from the parent so filtering stays cheap.
    let regionId: string | null = null;
    if (data.parentId) {
      const { data: parent, error } = await context.supabase
        .from("locations")
        .select("id, type, region_id")
        .eq("id", data.parentId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!parent) throw new Error("That parent place no longer exists");
      regionId = parent.type === "region" ? parent.id : (parent.region_id ?? null);
    }

    const payload = {
      name: data.name.trim(),
      slug,
      type: data.type,
      parent_id: data.parentId ?? null,
      region_id: data.type === "region" ? null : regionId,
      is_active: data.isActive ?? true,
      sort_order: data.sortOrder ?? 0,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
    };

    if (data.id) {
      const { error } = await context.supabase
        .from("locations")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    const { data: created, error } = await context.supabase
      .from("locations")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id as string };
  });

export const setLocationActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), isActive: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const { error } = await context.supabase
      .from("locations")
      .update({ is_active: data.isActive })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Moves every listing and child place onto the target, then disables the duplicate. */
export const mergeLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ fromId: z.string().uuid(), intoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    if (data.fromId === data.intoId) throw new Error("Choose a different place to merge into");
    const family = await subtreeIds(context as Ctx, data.fromId);
    if (family.includes(data.intoId)) {
      throw new Error("You cannot merge a place into one of its own children");
    }

    const moved = await context.supabase
      .from("properties")
      .update({ location_id: data.intoId })
      .eq("location_id", data.fromId);
    if (moved.error) throw new Error(moved.error.message);

    const children = await context.supabase
      .from("locations")
      .update({ parent_id: data.intoId })
      .eq("parent_id", data.fromId);
    if (children.error) throw new Error(children.error.message);

    const disabled = await context.supabase
      .from("locations")
      .update({ is_active: false })
      .eq("id", data.fromId);
    if (disabled.error) throw new Error(disabled.error.message);

    return { ok: true };
  });

/** Only ever removes an empty place with no children — otherwise ask to disable or merge. */
export const deleteLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const family = await subtreeIds(context as Ctx, data.id);

    const listings = await context.supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .in("location_id", family);
    if (listings.error) throw new Error(listings.error.message);
    if ((listings.count ?? 0) > 0) {
      throw new Error(
        "This place already has listings. Disable it or merge it into the correct place instead.",
      );
    }
    if (family.length > 1) {
      throw new Error("Move or remove the places inside it first, or just disable it.");
    }

    const { error } = await context.supabase.from("locations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const suggestLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().min(2).max(120),
        parentId: z.string().uuid().nullable().optional(),
        note: z.string().max(400).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const { error } = await ctx.supabase.from("location_suggestions").insert({
      raw_name: data.name.trim(),
      parent_location_id: data.parentId ?? null,
      submitted_by: ctx.userId,
      note: data.note?.trim() || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reviewSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approved", "dismissed"]),
        parentId: z.string().uuid().nullable().optional(),
        type: z.enum(LOCATION_TYPES).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);

    const { data: suggestion, error } = await ctx.supabase
      .from("location_suggestions")
      .select("id, raw_name, parent_location_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!suggestion) throw new Error("That suggestion no longer exists");
    if (suggestion.status !== "pending") throw new Error("That suggestion was already reviewed");

    if (data.decision === "approved") {
      const parentId = data.parentId ?? suggestion.parent_location_id;
      if (!parentId) throw new Error("Choose which place this area belongs to");
      const parent = await ctx.supabase
        .from("locations")
        .select("id, type, region_id")
        .eq("id", parentId)
        .maybeSingle();
      if (parent.error) throw new Error(parent.error.message);
      if (!parent.data) throw new Error("That parent place no longer exists");
      const created = await ctx.supabase.from("locations").insert({
        name: suggestion.raw_name.trim(),
        slug: slugify(suggestion.raw_name),
        type: data.type ?? "neighborhood",
        parent_id: parentId,
        region_id:
          parent.data.type === "region" ? parent.data.id : (parent.data.region_id ?? null),
      });
      if (created.error) throw new Error(created.error.message);
    }

    const reviewed = await ctx.supabase
      .from("location_suggestions")
      .update({
        status: data.decision,
        reviewed_by: ctx.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("status", "pending");
    if (reviewed.error) throw new Error(reviewed.error.message);

    return { ok: true, decision: data.decision };
  });
