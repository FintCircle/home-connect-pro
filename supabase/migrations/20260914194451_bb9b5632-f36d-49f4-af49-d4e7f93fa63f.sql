REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_landlord_verified() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_referral_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;