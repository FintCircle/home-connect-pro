# Pangisa location system — Uganda, built once for the whole country

Today Pangisa has three fixed levels (region → city → area). Kampala's divisions and Masaka's subdivisions don't fit, and adding a level anywhere would mean rebuilding. This replaces those three lists with one flexible location tree that admins control, and rewires listing, browsing, searching and URLs onto it.

## What changes for people using Pangisa

**Listing a property** — four searchable pickers that fill in as you go: Region, District/City, Town/Division, Area/Neighbourhood. Each one only offers places inside the previous choice, only active places, and search-as-you-type so nobody scrolls a list of hundreds. Deeper places appear only where they exist, so Mukono → Seeta can be the final stop while Kampala → Nakawa → Ntinda goes one level further. Editing a listing reopens with the previous choices intact. Under the last picker: "Can't find your area?" — the person types their area, it is saved as a suggestion for admin review and never appears as a real place until an admin approves it. The map pin, written directions and landmark stay exactly as they are.

**Finding a home** — a single search box on the home and browse pages. Typing "Ntinda" suggests "Ntinda, Nakawa, Kampala"; typing "Kira" suggests "Kira, Wakiso". Picking any place shows rentals in that place *and* everything under it, so Wakiso returns Kira, Nansana, Entebbe and Kasangati listings. Tapping through region → district → town → area still works for people who prefer browsing.

**Addresses in the browser** — readable location links: `/homes/central/kampala/nakawa/ntinda`, `/homes/central/wakiso/kira/najjera`, `/homes/central/mukono/seeta`. Old `/browse/...` and `/rentals/...` links keep working by redirecting to the new ones.

**Admin location manager** — an indented tree of every place with its listing count. Admins can add a place, rename it, change its web address, move it under a different parent, set its kind, turn it on or off, reorder the popular ones, and merge a duplicate into the correct place (listings move across). Deleting is blocked whenever a place or anything beneath it has listings — the screen offers disable or merge instead. A separate tab lists area suggestions from users: approve (creates the place under a chosen parent), or dismiss.

## Seed data

Central Region only, exactly the supplied list — 26 districts/cities, their towns, Kampala's five divisions with their known neighbourhoods, and Masaka's subdivisions. Nothing invented; no place added that wasn't given. Eastern, Northern and Western regions are seeded later into the same structure with no code changes.

## Technical shape

**One table, `public.locations`** (self-referencing): `id`, `name`, `slug`, `type` (enum: country, region, district, city, municipality, town, division, area, neighborhood, village), `parent_id → locations.id`, `region_id`, `latitude`, `longitude`, `is_active`, `sort_order`, `created_at`, `updated_at`. `full_path` text holds the slug path (`central/kampala/nakawa/ntinda`), unique, maintained by trigger so any rename or reparent recomputes it and its descendants. Unique `(parent_id, slug)`. Indexes on `parent_id`, `full_path`, and a trigram index on `name` for search. Public read of active rows to anon; admin-only write via `has_role`.

`public.location_suggestions`: `raw_name`, `parent_location_id`, `submitted_by`, `note`, `status` (pending/approved/dismissed), review columns. Insert by authenticated, read/manage by admin.

Two SQL functions: `location_descendants(uuid)` (recursive CTE returning the subtree ids) and `search_locations(text)` (name match, returns id, name, type, full_path and a display label built from ancestors) — both `SECURITY DEFINER`, `STABLE`, exposed to anon so public search and public listing pages work without a session.

**`properties.location_id`** added (`→ locations.id`), backfilled from existing `area_id` by matching seeded slugs; `area_id` kept nullable during transition, then unused by app code. `regions`/`cities`/`areas` stay in place as legacy tables (nothing reads them after this) so no data is dropped. Listing queries filter `location_id in (select location_descendants(:id))`.

**Routes** — `src/routes/homes.$.tsx` resolves the splat path against `full_path`, renders the breadcrumb, child places and descendant listings, with per-page `head()` titles/descriptions from the resolved location. Existing `browse.*` and `rentals.$areaSlug` routes become redirects. New `src/lib/locations.ts` holds the query hooks (`useLocationChildren`, `useLocationByPath`, `useLocationSearch`, `useDescendantListings`), `src/components/pangisa/location-picker.tsx` the cascading selectors (Command-based searchable popovers), `src/components/pangisa/location-search.tsx` the global search box. Admin manager as a new tab in `src/routes/_authenticated/admin.tsx` plus `src/lib/locations.functions.ts` server functions (`upsertLocation`, `mergeLocation`, `reviewSuggestion`) behind `requireSupabaseAuth` with an admin check.

## Order of work

1. Migration: enum, `locations`, `location_suggestions`, path trigger, grants/RLS, SQL functions, `properties.location_id`.
2. Seed Central Region (districts → towns → Kampala divisions/neighbourhoods → Masaka subdivisions), then backfill `properties.location_id`.
3. `src/lib/locations.ts` hooks + `/homes/$` route + redirects from old routes.
4. Cascading picker wired into list-property (with "Can't find your area?").
5. Global location search on home + browse.
6. Admin location manager and suggestion review.
