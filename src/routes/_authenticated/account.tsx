import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/pangisa/app-header";
import { BottomNav } from "@/components/pangisa/bottom-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthUser, useProfile } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Your account — Pangisa" },
      {
        name: "description",
        content: "Update your name, phone number and national ID so your listings show as verified.",
      },
      { property: "og:title", content: "Your account — Pangisa" },
      { property: "og:description", content: "Manage your Pangisa profile and verification." },
    ],
  }),
  component: Account,
});

function Account() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useAuthUser();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("id").eq("user_id", user!.id).eq("role", "admin").maybeSingle();
      return Boolean(data);
    },
  });
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    national_id_name: "",
    national_id_number: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        national_id_name: profile.national_id_name ?? "",
        national_id_number: profile.national_id_number ?? "",
      });
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update(form).eq("id", user!.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Saved");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen pb-20">
      <AppHeader title="Account" />
      <main className="mx-auto max-w-lg space-y-5 p-4">
        <section className="surface-card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Your details</h2>
            {profile?.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-verified px-2 py-1 text-[0.65rem] font-semibold text-verified-foreground">
                <ShieldCheck className="size-3" /> Verified
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
          <Field
            label="Full name"
            value={form.full_name}
            onChange={(value) => setForm({ ...form, full_name: value })}
          />
          <Field
            label="Phone number"
            value={form.phone}
            onChange={(value) => setForm({ ...form, phone: value })}
          />
          <p className="text-xs text-muted-foreground">
            Your phone number is only shared after an access fee is paid.
          </p>
        </section>

        <section className="surface-card space-y-3 p-4">
          <h2 className="font-display text-base font-semibold">National ID (optional)</h2>
          <p className="text-xs text-muted-foreground">
            Landlords who add their national ID get a verified badge, and their listings appear
            first.
          </p>
          <Field
            label="Name on the ID"
            value={form.national_id_name}
            onChange={(value) => setForm({ ...form, national_id_name: value })}
          />
          <Field
            label="NIN"
            value={form.national_id_number}
            onChange={(value) => setForm({ ...form, national_id_number: value })}
          />
        </section>

        <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>

        {profile?.referral_code ? (
          <p className="text-center text-xs text-muted-foreground">
            Your referral code is{" "}
            <span className="font-semibold text-primary">{profile.referral_code}</span>
          </p>
        ) : null}

        {isAdmin ? (
          <Link
            to="/admin"
            className="block rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-center text-sm font-semibold text-primary"
          >
            Open admin area
          </Link>
        ) : null}

        <Button variant="outline" className="w-full" onClick={signOut}>
          Sign out
        </Button>
      </main>
      <BottomNav />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
