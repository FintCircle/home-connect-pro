import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export function useAuthUser() {
  const [user, setUser] = useState<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUser(data.user);
        setIsLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { data: user, isLoading };
}

export function useProfile() {
  const { data: user, isLoading: authLoading } = useAuthUser();
  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return {
    data: user
      ? {
          ...(profile.data ?? {}),
          id: user.id,
          full_name:
            profile.data?.full_name ??
            user.user_metadata?.['full_name'] ??
            user.user_metadata?.['name'] ??
            null,
          avatar_url:
            user.user_metadata?.['avatar_url'] ?? user.user_metadata?.['picture'] ?? null,
          email: user.email ?? null,
          phone: profile.data?.phone ?? user.phone ?? null,
        }
      : null,
    isLoading: authLoading || profile.isLoading,
  };
}
