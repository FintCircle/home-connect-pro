CREATE TYPE public.location_type AS ENUM ('country','region','district','city','municipality','town','division','area','neighborhood','village');
CREATE TYPE public.suggestion_status AS ENUM ('pending','approved','dismissed');

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE public.locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  type public.location_type NOT NULL,
  parent_id uuid REFERENCES public.locations(id) ON DELETE RESTRICT,
  region_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  full_path text,
  latitude double precision,
  longitude double precision,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX locations_parent_slug_key ON public.locations (COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);
CREATE UNIQUE INDEX locations_full_path_key ON public.locations (full_path);
CREATE INDEX locations_parent_idx ON public.locations (parent_id);
CREATE INDEX locations_name_trgm_idx ON public.locations USING gin (name gin_trgm_ops);

GRANT SELECT ON public.locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active locations public" ON public.locations FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "admins read all locations" ON public.locations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert locations" ON public.locations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update locations" ON public.locations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete locations" ON public.locations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- full_path maintenance ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.locations_compute_path(_parent_id uuid, _slug text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE p record;
BEGIN
  IF _parent_id IS NULL THEN
    RETURN _slug;
  END IF;
  SELECT type, full_path INTO p FROM public.locations WHERE id = _parent_id;
  IF p IS NULL OR p.type = 'country' THEN
    RETURN _slug;
  END IF;
  RETURN p.full_path || '/' || _slug;
END;
$$;

CREATE OR REPLACE FUNCTION public.locations_refresh_subtree(_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE child record;
BEGIN
  FOR child IN SELECT id, slug FROM public.locations WHERE parent_id = _id LOOP
    UPDATE public.locations
      SET full_path = public.locations_compute_path(_id, child.slug)
      WHERE id = child.id;
    PERFORM public.locations_refresh_subtree(child.id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.locations_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.full_path := public.locations_compute_path(NEW.parent_id, NEW.slug);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.locations_after_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.slug IS DISTINCT FROM OLD.slug OR NEW.parent_id IS DISTINCT FROM OLD.parent_id) THEN
    PERFORM public.locations_refresh_subtree(NEW.id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER locations_path_before BEFORE INSERT OR UPDATE ON public.locations
FOR EACH ROW EXECUTE FUNCTION public.locations_before_write();

CREATE TRIGGER locations_path_after AFTER UPDATE ON public.locations
FOR EACH ROW EXECUTE FUNCTION public.locations_after_write();

-- lookups -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.location_descendants(_id uuid)
RETURNS TABLE(id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
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
SECURITY DEFINER
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
SECURITY DEFINER
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

GRANT EXECUTE ON FUNCTION public.location_descendants(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.location_ancestors(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_locations(text, integer) TO anon, authenticated;

-- suggestions ---------------------------------------------------------------
CREATE TABLE public.location_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_name text NOT NULL,
  parent_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  status public.suggestion_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.location_suggestions TO authenticated;
GRANT ALL ON public.location_suggestions TO service_role;

ALTER TABLE public.location_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submit suggestion" ON public.location_suggestions FOR INSERT TO authenticated WITH CHECK (submitted_by = auth.uid());
CREATE POLICY "read own or admin suggestions" ON public.location_suggestions FOR SELECT TO authenticated USING (submitted_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update suggestions" ON public.location_suggestions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER location_suggestions_touch BEFORE UPDATE ON public.location_suggestions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- properties link -----------------------------------------------------------
ALTER TABLE public.properties ADD COLUMN location_id uuid REFERENCES public.locations(id) ON DELETE RESTRICT;
CREATE INDEX properties_location_idx ON public.properties (location_id);
ALTER TABLE public.properties ALTER COLUMN area_id DROP NOT NULL;