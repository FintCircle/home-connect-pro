import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { accessFee, listingFee, referralShare, MIN_WITHDRAWAL_UGX } from "@/lib/fees";

/**
 * Payments are recorded as completed by the platform for now. When the PesaJet
 * account is live, this is the single place that needs to call the provider and
 * wait for its confirmation before the rest of the logic runs.
 */
const PROVIDER = "placeholder";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function payReferralShare(
  db: Awaited<ReturnType<typeof admin>>,
  payerId: string,
  paymentId: string,
  feeUgx: number,
) {
  const { data: payer } = await db
    .from("profiles")
    .select("referred_by")
    .eq("id", payerId)
    .maybeSingle();
  const referrer = payer?.referred_by;
  if (!referrer) return;
  await db.from("referral_earnings").insert({
    referrer_id: referrer,
    referred_user_id: payerId,
    payment_id: paymentId,
    amount_ugx: referralShare(feeUgx),
  });
}

/** Landlord pays the go-live fee (5% of the rent, discounted for multi-unit). */
export const publishProperty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ propertyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: property, error } = await db
      .from("properties")
      .select("id, landlord_id, rent_ugx, has_units, total_units, status")
      .eq("id", data.propertyId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!property || property.landlord_id !== context.userId) throw new Error("Listing not found");
    if (property.status === "live") return { alreadyLive: true, amount: 0 };

    const fee = listingFee(property.rent_ugx, property.has_units, property.total_units);
    const { data: payment, error: payError } = await db
      .from("payments")
      .insert({
        user_id: context.userId,
        property_id: property.id,
        kind: "listing",
        amount_ugx: fee.total,
        status: "paid",
        provider: PROVIDER,
      })
      .select("id")
      .single();
    if (payError) throw new Error(payError.message);

    await db
      .from("properties")
      .update({ status: "live", live_at: new Date().toISOString(), listing_fee_ugx: fee.total })
      .eq("id", property.id);

    await payReferralShare(db, context.userId, payment.id, fee.total);
    return { alreadyLive: false, amount: fee.total };
  });

/** Tenant pays the one-off access fee: both sides get each other's phone number. */
export const unlockProperty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ propertyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: property } = await db
      .from("properties")
      .select("id, landlord_id, rent_ugx, status")
      .eq("id", data.propertyId)
      .maybeSingle();
    if (!property) throw new Error("Listing not found");
    if (property.landlord_id === context.userId) throw new Error("This is your own listing");

    const { data: existing } = await db
      .from("unlocks")
      .select("id")
      .eq("property_id", property.id)
      .eq("tenant_id", context.userId)
      .maybeSingle();
    if (existing) return { alreadyUnlocked: true, amount: 0 };
    if (property.status !== "live") throw new Error("This rental is no longer available");

    const { data: tenant } = await db
      .from("profiles")
      .select("phone")
      .eq("id", context.userId)
      .maybeSingle();
    if (!tenant?.phone) throw new Error("Add your phone number to your account first");
    const { data: landlord } = await db
      .from("profiles")
      .select("phone")
      .eq("id", property.landlord_id)
      .maybeSingle();

    const fee = accessFee(property.rent_ugx);
    const { data: payment, error: payError } = await db
      .from("payments")
      .insert({
        user_id: context.userId,
        property_id: property.id,
        kind: "access",
        amount_ugx: fee,
        status: "paid",
        provider: PROVIDER,
      })
      .select("id")
      .single();
    if (payError) throw new Error(payError.message);

    const { error: unlockError } = await db.from("unlocks").insert({
      property_id: property.id,
      tenant_id: context.userId,
      landlord_id: property.landlord_id,
      amount_ugx: fee,
      tenant_phone: tenant.phone,
      landlord_phone: landlord?.phone ?? null,
    });
    if (unlockError) throw new Error(unlockError.message);

    await db.from("properties").update({ status: "taken" }).eq("id", property.id);
    await payReferralShare(db, context.userId, payment.id, fee);
    return { alreadyUnlocked: false, amount: fee };
  });

/** Landlord switches a listing between live and paused/taken. */
export const setListingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        propertyId: z.string().uuid(),
        status: z.enum(["live", "paused", "taken"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: property } = await db
      .from("properties")
      .select("id, landlord_id, status, live_at")
      .eq("id", data.propertyId)
      .maybeSingle();
    if (!property || property.landlord_id !== context.userId) throw new Error("Listing not found");
    if (!property.live_at) throw new Error("Pay the listing fee first to go live");
    await db.from("properties").update({ status: data.status }).eq("id", property.id);
    return { status: data.status };
  });

/** Tenant lets a rental go if they are not continuing — it becomes visible again. */
export const releaseUnlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ propertyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: unlock } = await db
      .from("unlocks")
      .select("id, property_id, tenant_id")
      .eq("property_id", data.propertyId)
      .eq("tenant_id", context.userId)
      .maybeSingle();
    if (!unlock) throw new Error("You have not unlocked this rental");
    await db.from("unlocks").update({ released_by_tenant: true }).eq("id", unlock.id);
    const { data: property } = await db
      .from("properties")
      .select("status, live_at")
      .eq("id", data.propertyId)
      .maybeSingle();
    if (property?.status === "taken" && property.live_at) {
      await db.from("properties").update({ status: "live" }).eq("id", data.propertyId);
    }
    return { released: true };
  });

/** Silent review, visible to Pangisa admins only. */
export const submitSilentReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        propertyId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: unlock } = await db
      .from("unlocks")
      .select("landlord_id")
      .eq("property_id", data.propertyId)
      .eq("tenant_id", context.userId)
      .maybeSingle();
    if (!unlock) throw new Error("Only tenants who unlocked this rental can review it");
    const { error } = await db.from("landlord_reviews").upsert(
      {
        property_id: data.propertyId,
        landlord_id: unlock.landlord_id,
        tenant_id: context.userId,
        rating: data.rating,
        comment: data.comment ?? null,
      },
      { onConflict: "property_id,tenant_id" },
    );
    if (error) throw new Error(error.message);
    return { saved: true };
  });

/** Affiliate asks for a payout once earnings reach the minimum. */
export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ payoutPhone: z.string().min(9).max(20) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: earnings } = await db
      .from("referral_earnings")
      .select("amount_ugx")
      .eq("referrer_id", context.userId);
    const { data: payouts } = await db
      .from("withdrawals")
      .select("amount_ugx, status")
      .eq("user_id", context.userId);

    const earned = (earnings ?? []).reduce((sum, row) => sum + Number(row.amount_ugx), 0);
    const claimed = (payouts ?? [])
      .filter((row) => row.status !== "rejected")
      .reduce((sum, row) => sum + Number(row.amount_ugx), 0);
    const available = earned - claimed;
    if (available < MIN_WITHDRAWAL_UGX) {
      throw new Error(`You need at least UGX ${MIN_WITHDRAWAL_UGX} available to withdraw`);
    }
    const { error } = await db.from("withdrawals").insert({
      user_id: context.userId,
      amount_ugx: available,
      payout_phone: data.payoutPhone,
    });
    if (error) throw new Error(error.message);
    return { amount: available };
  });
