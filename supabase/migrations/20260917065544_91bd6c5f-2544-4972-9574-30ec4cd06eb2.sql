DROP INDEX IF EXISTS public.locations_name_trgm_idx;
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.location_descendants(_id uuid)
RETURNS TABLE(id uuid)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH RECURSIVE tree AS (
    SELECT l.id FROM public.locations l WHERE l.id = _id
    UNION ALL
    SELECT c.id FROM public.locations c JOIN tree t ON c.parent_id = t.id
  )
  SELECT tree.id FROM tree
$$;

CREATE OR REPLACE FUNCTION public.location_ancestors(_id uuid)
RETURNS TABLE(id uuid, name text, slug text, type public.location_type, full_path text, depth integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH RECURSIVE up AS (
    SELECT l.id, l.name, l.slug, l.type, l.full_path, l.parent_id, 0 AS depth
    FROM public.locations l WHERE l.id = _id
    UNION ALL
    SELECT p.id, p.name, p.slug, p.type, p.full_path, p.parent_id, up.depth + 1
    FROM public.locations p JOIN up ON up.parent_id = p.id
  )
  SELECT up.id, up.name, up.slug, up.type, up.full_path, up.depth FROM up ORDER BY up.depth DESC
$$;

CREATE OR REPLACE FUNCTION public.search_locations(_term text, _limit integer DEFAULT 15)
RETURNS TABLE(id uuid, name text, type public.location_type, full_path text, label text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT l.id, l.name, l.type, l.full_path,
    (
      SELECT string_agg(a.name, ', ' ORDER BY a.depth ASC)
      FROM public.location_ancestors(l.id) a
      WHERE a.type <> 'country' AND a.depth < 3
    ) AS label
  FROM public.locations l
  WHERE l.is_active = true
    AND l.type NOT IN ('country')
    AND (_term IS NULL OR _term = '' OR l.name ILIKE '%' || _term || '%')
  ORDER BY (lower(l.name) = lower(coalesce(_term,''))) DESC,
           (lower(l.name) LIKE lower(coalesce(_term,'')) || '%') DESC,
           l.sort_order ASC, l.name ASC
  LIMIT GREATEST(1, LEAST(coalesce(_limit, 15), 50))
$$;