-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  referral_code text UNIQUE,
  referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  national_id_number text,
  national_id_name text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile readable" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE code text;
BEGIN
  LOOP
    code := 'Pan' || lpad((floor(random()*10000))::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code);
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, referral_code, referred_by)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone',
    public.generate_referral_code(),
    (SELECT p.id FROM public.profiles p
      WHERE p.referral_code = upper(NEW.raw_user_meta_data ->> 'referral_code')
         OR p.referral_code = (NEW.raw_user_meta_data ->> 'referral_code')
      LIMIT 1)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- GEOGRAPHY
CREATE TABLE public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0
);
CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0
);
CREATE TABLE public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.regions, public.cities, public.areas TO anon, authenticated;
GRANT ALL ON public.regions, public.cities, public.areas TO service_role;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "regions public" ON public.regions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "cities public" ON public.cities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "areas public" ON public.areas FOR SELECT TO anon, authenticated USING (true);

-- PROPERTIES
CREATE TYPE public.property_status AS ENUM ('draft','live','taken','paused');

CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES public.areas(id),
  title text NOT NULL,
  description text,
  property_type text NOT NULL,
  rent_ugx bigint NOT NULL,
  deposit_months int NOT NULL DEFAULT 1,
  bedrooms int NOT NULL DEFAULT 1,
  bathrooms int NOT NULL DEFAULT 1,
  sitting_rooms int NOT NULL DEFAULT 1,
  self_contained boolean NOT NULL DEFAULT true,
  furnishing text NOT NULL DEFAULT 'unfurnished',
  water_source text,
  power_source text,
  fence_gate text,
  parking_spaces int NOT NULL DEFAULT 0,
  amenities text[] NOT NULL DEFAULT '{}',
  video_url text,
  landmark text,
  has_units boolean NOT NULL DEFAULT false,
  total_units int NOT NULL DEFAULT 1,
  units_available int NOT NULL DEFAULT 1,
  status public.property_status NOT NULL DEFAULT 'draft',
  landlord_verified boolean NOT NULL DEFAULT false,
  listing_fee_ugx bigint,
  live_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT SELECT ON public.properties TO anon;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live properties public" ON public.properties FOR SELECT TO anon, authenticated USING (status = 'live');
CREATE POLICY "own properties readable" ON public.properties FOR SELECT TO authenticated USING (landlord_id = auth.uid());
CREATE POLICY "landlord inserts own" ON public.properties FOR INSERT TO authenticated WITH CHECK (landlord_id = auth.uid());
CREATE POLICY "landlord updates own" ON public.properties FOR UPDATE TO authenticated USING (landlord_id = auth.uid()) WITH CHECK (landlord_id = auth.uid());
CREATE POLICY "landlord deletes own" ON public.properties FOR DELETE TO authenticated USING (landlord_id = auth.uid());
CREATE TRIGGER properties_touch BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.sync_landlord_verified()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.properties SET landlord_verified = NEW.verified WHERE landlord_id = NEW.id;
  RETURN NEW;
END; $$;
CREATE TRIGGER profiles_verified_sync AFTER UPDATE OF verified ON public.profiles
FOR EACH ROW WHEN (OLD.verified IS DISTINCT FROM NEW.verified)
EXECUTE FUNCTION public.sync_landlord_verified();

CREATE TABLE public.property_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_images TO authenticated;
GRANT SELECT ON public.property_images TO anon;
GRANT ALL ON public.property_images TO service_role;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "images readable" ON public.property_images FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND (p.status = 'live' OR p.landlord_id = auth.uid())));
CREATE POLICY "landlord manages images" ON public.property_images FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.landlord_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.landlord_id = auth.uid()));

-- UNLOCKS (paid contact exchange)
CREATE TABLE public.unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  landlord_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_ugx bigint NOT NULL,
  tenant_phone text,
  landlord_phone text,
  released_by_tenant boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, tenant_id)
);
GRANT SELECT, UPDATE ON public.unlocks TO authenticated;
GRANT ALL ON public.unlocks TO service_role;
ALTER TABLE public.unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unlock parties read" ON public.unlocks FOR SELECT TO authenticated USING (tenant_id = auth.uid() OR landlord_id = auth.uid());
CREATE POLICY "tenant releases" ON public.unlocks FOR UPDATE TO authenticated USING (tenant_id = auth.uid()) WITH CHECK (tenant_id = auth.uid());

-- PRIVATE EXACT LOCATION
CREATE TABLE public.property_locations (
  property_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
  address_exact text,
  latitude double precision,
  longitude double precision,
  directions_note text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_locations TO authenticated;
GRANT ALL ON public.property_locations TO service_role;
ALTER TABLE public.property_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner or unlocked reads location" ON public.property_locations FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.landlord_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.unlocks u WHERE u.property_id = property_locations.property_id AND u.tenant_id = auth.uid())
);
CREATE POLICY "owner manages location" ON public.property_locations FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.landlord_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.landlord_id = auth.uid()));

-- PAYMENTS
CREATE TYPE public.payment_kind AS ENUM ('listing','access');
CREATE TYPE public.payment_status AS ENUM ('pending','paid','failed');

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  kind public.payment_kind NOT NULL,
  amount_ugx bigint NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  provider text NOT NULL DEFAULT 'placeholder',
  provider_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payments" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid());

-- REFERRALS
CREATE TABLE public.referral_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  amount_ugx bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_earnings TO authenticated;
GRANT ALL ON public.referral_earnings TO service_role;
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own earnings" ON public.referral_earnings FOR SELECT TO authenticated USING (referrer_id = auth.uid());

CREATE TYPE public.withdrawal_status AS ENUM ('requested','paid','rejected');
CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_ugx bigint NOT NULL,
  payout_phone text,
  status public.withdrawal_status NOT NULL DEFAULT 'requested',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own withdrawals" ON public.withdrawals FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- SILENT REVIEWS (admin only)
CREATE TABLE public.landlord_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  landlord_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, tenant_id)
);
GRANT SELECT, INSERT ON public.landlord_reviews TO authenticated;
GRANT ALL ON public.landlord_reviews TO service_role;
ALTER TABLE public.landlord_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads reviews" ON public.landlord_reviews FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR tenant_id = auth.uid());
CREATE POLICY "unlocked tenant reviews" ON public.landlord_reviews FOR INSERT TO authenticated
WITH CHECK (tenant_id = auth.uid() AND EXISTS (SELECT 1 FROM public.unlocks u WHERE u.property_id = landlord_reviews.property_id AND u.tenant_id = auth.uid()));

CREATE INDEX properties_area_status_idx ON public.properties (area_id, status);
CREATE INDEX properties_landlord_idx ON public.properties (landlord_id);
CREATE INDEX cities_region_idx ON public.cities (region_id);
CREATE INDEX areas_city_idx ON public.areas (city_id);