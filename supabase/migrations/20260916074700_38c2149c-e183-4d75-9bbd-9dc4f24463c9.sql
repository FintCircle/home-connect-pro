ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);

DROP POLICY IF EXISTS "Admins manage withdrawals" ON public.withdrawals;
CREATE POLICY "Admins manage withdrawals" ON public.withdrawals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage all properties" ON public.properties;
CREATE POLICY "Admins manage all properties" ON public.properties FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_referral_leaders()
RETURNS TABLE (referrer_id uuid, full_name text, referral_code text, joined_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.referral_code, count(r.id) AS joined_count
  FROM public.profiles p
  JOIN public.profiles r ON r.referred_by = p.id
  WHERE public.has_role(auth.uid(), 'admin')
  GROUP BY p.id, p.full_name, p.referral_code
  ORDER BY joined_count DESC
  LIMIT 50
$$;

REVOKE ALL ON FUNCTION public.get_referral_leaders() FROM public;
GRANT EXECUTE ON FUNCTION public.get_referral_leaders() TO authenticated;