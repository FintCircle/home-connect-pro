REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_landlord_verified() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_referral_code() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;