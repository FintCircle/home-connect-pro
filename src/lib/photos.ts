import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const BUCKET = "property-photos";

/** Photos live in a private bucket, so viewing them needs short-lived signed links. */
export function usePhotoUrls(paths: string[] | undefined) {
  const key = (paths ?? []).join("|");
  return useQuery({
    queryKey: ["photo-urls", key],
    enabled: (paths ?? []).length > 0,
    staleTime: 45 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(paths as string[], 60 * 60);
      if (error) throw error;
      return (data ?? []).map((item) => item.signedUrl);
    },
  });
}

export async function uploadPropertyPhoto(userId: string, file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}
