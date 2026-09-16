import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/pangisa/app-header";
import { BottomNav } from "@/components/pangisa/bottom-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthUser, useProfile } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatUgx, MIN_WITHDRAWAL_UGX, REFERRAL_PERCENT } from "@/lib/fees";
import { requestWithdrawal } from "@/lib/pangisa.functions";

export const Route = createFileRoute("/_authenticated/affiliates")({
  head: () => ({
    meta: [
      { title: "Funa Sente — earn with Pangisa" },
      {
        name: "description",
        content:
          "Share your Pangisa code, bring landlords and tenants on board and earn 3% of every fee they pay.",
      },
      { property: "og:title", content: "Funa Sente — earn with Pangisa" },
      {
        property: "og:description",
        content: "Share your code and earn 3% of every Pangisa fee your people pay.",
      },
    ],
  }),
  component: Affiliates,
});

function Affiliates() {
  const queryClient = useQueryClient();
  const { data: user } = useAuthUser();
  const { data: profile } = useProfile();
  const [payoutPhone, setPayoutPhone] = useState("");
  const withdrawFn = useServerFn(requestWithdrawal);

  const earnings = useQuery({
    queryKey: ["earnings", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const [{ data: rows, error: earningsError }, { data: payouts, error: payoutsError }, { data: referredCount, error: referralError }] = await Promise.all([
        supabase.from("referral_earnings").select("amount_ugx, created_at"),
        supabase.from("withdrawals").select("amount_ugx, status, created_at"),
        supabase.rpc("get_my_referral_count"),
      ]);
      if (earningsError) throw earningsError;
      if (payoutsError) throw payoutsError;
      if (referralError) throw referralError;
      const earned = (rows ?? []).reduce((sum, row) => sum + Number(row.amount_ugx), 0);
      const total = (status: string) =>
        (payouts ?? [])
          .filter((row) => row.status === status)
          .reduce((sum, row) => sum + Number(row.amount_ugx), 0);
      const pending = total("requested");
      const paid = total("paid");
      return {
        earned,
        pending,
        paid,
        available: Math.max(0, earned - pending - paid),
        count: referredCount ?? 0,
        payouts: payouts ?? [],
      };
    },
  });

  const withdraw = useMutation({
    mutationFn: () => withdrawFn({ data: { payoutPhone } }),
    onSuccess: (result) => {
      toast.success(`Withdrawal of ${formatUgx(result.amount)} requested.`);
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const code = profile?.referral_code ?? "";
  const link =
    typeof window !== "undefined" && code ? `${window.location.origin}/?ref=${code}` : "";

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: "Pangisa", text: "Find or list a rental on Pangisa", url: link });
      return;
    }
    await navigator.clipboard.writeText(link);
    toast.success("Link copied");
  }

  return (
    <div className="min-h-screen pb-20">
      <AppHeader title="Funa Sente" />
      <main className="mx-auto max-w-lg space-y-5 p-4">
        <section className="surface-card space-y-3 p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Your code</p>
          <p className="font-display text-3xl font-extrabold text-primary">{code || "…"}</p>
          <p className="text-xs text-muted-foreground">
            Earn {REFERRAL_PERCENT}% of every Pangisa fee paid by people who join through you. The
            first person to invite someone keeps them for life.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => {
              navigator.clipboard.writeText(link);
              toast.success("Link copied");
            }}>
              <Copy className="mr-2 size-4" /> Copy link
            </Button>
            <Button className="flex-1" onClick={share}>
              <Share2 className="mr-2 size-4" /> Share
            </Button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <Stat label="People joined" value={String(earnings.data?.count ?? 0)} />
          <Stat label="Earned" value={formatUgx(earnings.data?.earned ?? 0)} />
          <Stat label="Available" value={formatUgx(earnings.data?.available ?? 0)} />
          <Stat label="Waiting for approval" value={formatUgx(earnings.data?.pending ?? 0)} />
          <Stat label="Paid to you" value={formatUgx(earnings.data?.paid ?? 0)} />
          <Stat
            label="Next payout at"
            value={formatUgx(MIN_WITHDRAWAL_UGX)}
          />
        </section>


        <section className="surface-card space-y-3 p-4">
          <h2 className="font-display text-base font-semibold">Withdraw</h2>
          <p className="text-xs text-muted-foreground">
            You can withdraw once you have {formatUgx(MIN_WITHDRAWAL_UGX)} available. Payouts go to
            your mobile money number.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="payout">Mobile money number</Label>
            <Input
              id="payout"
              inputMode="tel"
              placeholder="07xx xxx xxx"
              value={payoutPhone}
              onChange={(event) => setPayoutPhone(event.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={
              withdraw.isPending ||
              payoutPhone.trim().length < 9 ||
              (earnings.data?.available ?? 0) < MIN_WITHDRAWAL_UGX
            }
            onClick={() => withdraw.mutate()}
          >
            Request withdrawal
          </Button>
          {earnings.data?.payouts?.length ? (
            <ul className="space-y-1 pt-2 text-xs text-muted-foreground">
              {earnings.data.payouts.map((payout, index) => (
                <li key={index}>
                  {formatUgx(payout.amount_ugx)} — {payout.status} ·{" "}
                  {new Date(payout.created_at).toLocaleDateString()}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-3 text-center">
      <p className="font-display text-sm font-bold">{value}</p>
      <p className="text-[0.65rem] text-muted-foreground">{label}</p>
    </div>
  );
}
