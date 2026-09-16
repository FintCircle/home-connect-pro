import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Check, EyeOff, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/pangisa/app-header";
import { BottomNav } from "@/components/pangisa/bottom-nav";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthUser } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatUgx } from "@/lib/fees";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Pangisa" }] }),
  component: Admin,
});

function Admin() {
  const router = useRouter();
  const { data: user, isLoading: authLoading } = useAuthUser();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      void router.navigate({ to: "/auth", search: { redirect: "/admin" }, replace: true });
      return;
    }
    void supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setAllowed(Boolean(data)));
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!authLoading && user && allowed === false) {
      void router.navigate({ to: "/dashboard", replace: true });
    }
  }, [allowed, authLoading, router, user]);

  const data = useQuery({
    queryKey: ["admin-data"],
    enabled: allowed === true,
    queryFn: async () => {
      const [profiles, properties, withdrawals, relationships] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone, referral_code, referred_by, verified, created_at").order("created_at", { ascending: false }),
        supabase.from("properties").select("id, title, status, rent_ugx, landlord_id, created_at, areas(name, cities(name))").order("created_at", { ascending: false }),
        supabase.from("withdrawals").select("id, user_id, amount_ugx, payout_phone, status, admin_note, created_at").order("created_at", { ascending: false }),
        supabase.from("referral_relationships").select("id, referrer_id, referred_user_id, referral_code, created_at").order("created_at", { ascending: false }),
      ]);
      const error = profiles.error ?? properties.error ?? withdrawals.error ?? relationships.error;
      if (error) throw error;
      const allProfiles = profiles.data ?? [];
      const referralCounts = new Map<string, number>();
      for (const relationship of relationships.data ?? []) {
        referralCounts.set(relationship.referrer_id, (referralCounts.get(relationship.referrer_id) ?? 0) + 1);
      }
      return {
        profiles: allProfiles,
        properties: properties.data ?? [],
        withdrawals: withdrawals.data ?? [],
        referralSummary: allProfiles
          .map((profile) => ({ ...profile, referralCount: referralCounts.get(profile.id) ?? 0 }))
          .filter((profile) => profile.referralCount > 0)
          .sort((a, b) => b.referralCount - a.referralCount),
      };
    },
  });

  const updateWithdrawal = useMutation({
    mutationFn: async (input: { id: string; status: "paid" | "rejected"; admin_note: string }) => {
      const { error } = await supabase.from("withdrawals").update({ ...input, reviewed_at: new Date().toISOString(), reviewed_by: user!.id }).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Withdrawal updated"); queryClient.invalidateQueries({ queryKey: ["admin-data"] }); },
    onError: (error: Error) => toast.error(error.message),
  });

  const moderate = useMutation({
    mutationFn: async (input: { id: string; status: "live" | "paused" | "taken" }) => {
      const { error } = await supabase.from("properties").update({ status: input.status, ...(input.status === "live" ? { live_at: new Date().toISOString() } : {}) }).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Listing status updated"); queryClient.invalidateQueries({ queryKey: ["admin-data"] }); queryClient.invalidateQueries(); },
    onError: (error: Error) => toast.error(error.message),
  });

  if (authLoading || !user || allowed === null || allowed === false) return <Skeleton className="m-4 h-32" />;

  return (
    <div className="min-h-screen pb-20">
      <AppHeader title="Admin" back />
      <main className="mx-auto max-w-3xl space-y-6 p-4">
        <section><h2 className="font-display text-lg font-bold">Signed-up users ({data.data?.profiles.length ?? 0})</h2><div className="mt-3 space-y-2">{data.data?.profiles.map((profile) => <div key={profile.id} className="surface-card flex items-center justify-between gap-3 p-4 text-sm"><div><p className="font-semibold">{profile.full_name || "Unnamed user"}</p><p className="text-xs text-muted-foreground">{profile.phone || "No phone"} · {profile.referral_code}</p></div><span className="text-xs text-muted-foreground">{new Date(profile.created_at).toLocaleDateString()}</span></div>)}</div></section>
        <section><h2 className="font-display text-lg font-bold">Referral leaders</h2><div className="mt-3 space-y-2">{data.data?.referralSummary.map((profile) => <div key={profile.id} className="surface-card flex items-center justify-between p-4 text-sm"><div><p className="font-semibold">{profile.full_name || "Unnamed user"}</p><p className="text-xs text-muted-foreground">{profile.referral_code || "No code"}</p></div><span className="font-display font-bold text-primary">{profile.referralCount} referred</span></div>)}</div></section>
        <section><h2 className="font-display text-lg font-bold">Listings</h2><div className="mt-3 space-y-2">{data.data?.properties.map((property) => <div key={property.id} className="surface-card flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold">{property.title}</p><p className="text-xs text-muted-foreground">{formatUgx(property.rent_ugx)} · {property.areas?.name}, {property.areas?.cities?.name}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-muted px-2 py-1 text-[0.65rem] uppercase">{property.status}</span><Select value={property.status} onValueChange={(status) => moderate.mutate({ id: property.id, status: status as "live" | "paused" | "taken" })}><SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="live">Publish</SelectItem><SelectItem value="paused">Unpublish</SelectItem><SelectItem value="taken">Taken</SelectItem></SelectContent></Select></div></div>)}</div></section>
        <section><h2 className="font-display text-lg font-bold">Withdrawal requests</h2><div className="mt-3 space-y-2">{data.data?.withdrawals.map((withdrawal) => <WithdrawalRow key={withdrawal.id} withdrawal={withdrawal} onUpdate={(status, note) => updateWithdrawal.mutate({ id: withdrawal.id, status, admin_note: note })} />)}</div></section>
      </main><BottomNav />
    </div>
  );
}

function WithdrawalRow({ withdrawal, onUpdate }: { withdrawal: { id: string; amount_ugx: number; payout_phone: string | null; status: string; admin_note: string | null; created_at: string }; onUpdate: (status: "paid" | "rejected", note: string) => void }) {
  const [note, setNote] = useState(withdrawal.admin_note ?? "");
  return <div className="surface-card space-y-3 p-4 text-sm"><div className="flex justify-between gap-3"><div><p className="font-semibold">{formatUgx(withdrawal.amount_ugx)} → {withdrawal.payout_phone || "No number"}</p><p className="text-xs text-muted-foreground">{withdrawal.status} · {new Date(withdrawal.created_at).toLocaleDateString()}</p></div>{withdrawal.status === "requested" ? <div className="flex gap-1"><Button size="icon" variant="outline" aria-label="Approve withdrawal" onClick={() => onUpdate("paid", note)}><Check className="size-4" /></Button><Button size="icon" variant="outline" aria-label="Reject withdrawal" onClick={() => onUpdate("rejected", note)}><X className="size-4" /></Button></div> : <EyeOff className="size-4 text-muted-foreground" />}</div><input className="h-9 w-full rounded-md border bg-background px-3 text-xs" placeholder="Admin note (optional)" value={note} onChange={(event) => setNote(event.target.value)} /></div>;
}
