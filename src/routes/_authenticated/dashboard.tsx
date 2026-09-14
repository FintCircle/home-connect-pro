import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/pangisa/app-header";
import { BottomNav } from "@/components/pangisa/bottom-nav";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthUser } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatUgx } from "@/lib/fees";
import { setListingStatus } from "@/lib/pangisa.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — Pangisa" },
      {
        name: "description",
        content: "Manage your listings, see unlocks and follow your rentals in one place.",
      },
      { property: "og:title", content: "Your dashboard — Pangisa" },
      { property: "og:description", content: "Manage your Pangisa listings and unlocks." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const queryClient = useQueryClient();
  const { data: user } = useAuthUser();
  const statusFn = useServerFn(setListingStatus);

  const listings = useQuery({
    queryKey: ["my-listings", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, rent_ugx, status, live_at, units_available, total_units, has_units")
        .eq("landlord_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const unlocks = useQuery({
    queryKey: ["my-unlocks", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unlocks")
        .select("id, property_id, tenant_phone, landlord_phone, landlord_id, amount_ugx, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const change = useMutation({
    mutationFn: (input: { propertyId: string; status: "live" | "paused" | "taken" }) =>
      statusFn({ data: input }),
    onSuccess: () => {
      toast.success("Listing updated");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const asLandlord = (unlocks.data ?? []).filter((row) => row.landlord_id === user?.id);
  const asTenant = (unlocks.data ?? []).filter((row) => row.landlord_id !== user?.id);

  return (
    <div className="min-h-screen pb-20">
      <AppHeader title="Dashboard" />
      <main className="mx-auto max-w-lg space-y-6 p-4">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Your listings</h2>
            <Button asChild size="sm" variant="outline">
              <Link to="/list-property">
                <Plus className="mr-1 size-4" /> Add
              </Link>
            </Button>
          </div>
          <div className="mt-3 space-y-3">
            {listings.isLoading ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : listings.data?.length === 0 ? (
              <p className="surface-card p-4 text-sm text-muted-foreground">
                No listings yet. Add your first property.
              </p>
            ) : (
              listings.data?.map((listing) => (
                <div key={listing.id} className="surface-card space-y-2 p-4">
                  <Link
                    to="/property/$propertyId"
                    params={{ propertyId: listing.id }}
                    className="block font-display text-[0.95rem] font-semibold"
                  >
                    {listing.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatUgx(listing.rent_ugx)} / month
                    {listing.has_units
                      ? ` · ${listing.units_available}/${listing.total_units} units left`
                      : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-1 text-[0.65rem] font-semibold uppercase">
                      {listing.status}
                    </span>
                    {listing.live_at ? (
                      <Select
                        value={listing.status}
                        onValueChange={(value) =>
                          change.mutate({
                            propertyId: listing.id,
                            status: value as "live" | "paused" | "taken",
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-auto text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="live">Live</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                          <SelectItem value="taken">Taken</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold">Tenants who paid for your contact</h2>
          <div className="mt-3 space-y-2">
            {asLandlord.length === 0 ? (
              <p className="surface-card p-4 text-sm text-muted-foreground">
                No tenant has unlocked your listings yet.
              </p>
            ) : (
              asLandlord.map((row) => (
                <div key={row.id} className="surface-card p-4 text-sm">
                  <a href={`tel:${row.tenant_phone ?? ""}`} className="font-display font-semibold">
                    {row.tenant_phone ?? "No phone"}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    Paid {formatUgx(row.amount_ugx)} ·{" "}
                    {new Date(row.created_at).toLocaleDateString()}
                  </p>
                  <Link
                    to="/property/$propertyId"
                    params={{ propertyId: row.property_id }}
                    className="text-xs text-primary underline"
                  >
                    View listing
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold">Rentals you unlocked</h2>
          <div className="mt-3 space-y-2">
            {asTenant.length === 0 ? (
              <p className="surface-card p-4 text-sm text-muted-foreground">
                You have not unlocked any rentals yet.
              </p>
            ) : (
              asTenant.map((row) => (
                <div key={row.id} className="surface-card p-4 text-sm">
                  <a
                    href={`tel:${row.landlord_phone ?? ""}`}
                    className="font-display font-semibold"
                  >
                    {row.landlord_phone ?? "No phone"}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    Paid {formatUgx(row.amount_ugx)} ·{" "}
                    {new Date(row.created_at).toLocaleDateString()}
                  </p>
                  <Link
                    to="/property/$propertyId"
                    params={{ propertyId: row.property_id }}
                    className="text-xs text-primary underline"
                  >
                    View rental
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
