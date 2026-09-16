CREATE OR REPLACE FUNCTION public.get_my_referral_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM public.profiles WHERE referred_by = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.get_my_referral_count() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_referral_count() TO authenticated;

CREATE OR REPLACE FUNCTION public.attach_referral_by_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer uuid;
BEGIN
  IF auth.uid() IS NULL OR p_code IS NULL THEN
    RETURN false;
  END IF;

  SELECT id INTO v_referrer FROM public.profiles WHERE upper(referral_code) = upper(p_code) LIMIT 1;

  IF v_referrer IS NULL OR v_referrer = auth.uid() THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET referred_by = v_referrer
  WHERE id = auth.uid() AND referred_by IS NULL;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_referral_by_code(text) FROM public;
GRANT EXECUTE ON FUNCTION public.attach_referral_by_code(text) TO authenticated;