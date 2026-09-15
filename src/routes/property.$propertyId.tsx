import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  BedDouble,
  Bath,
  Car,
  Check,
  Droplets,
  Lock,
  MapPin,
  Phone,
  ShieldCheck,
  Sofa,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/pangisa/app-header";
import { BottomNav } from "@/components/pangisa/bottom-nav";
import { LocationMap, youtubeEmbedUrl } from "@/components/pangisa/location-map";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuthUser } from "@/hooks/use-auth";
import { accessFee, formatUgx } from "@/lib/fees";
import { releaseUnlock, submitSilentReview, unlockProperty } from "@/lib/pangisa.functions";
import { usePhotoUrls } from "@/lib/photos";
import { useMyUnlock, useProperty, usePropertyLocation } from "@/lib/queries";

export const Route = createFileRoute("/property/$propertyId")({
  head: () => ({
    meta: [
      { title: "Rental details — Pangisa" },
      {
        name: "description",
        content:
          "See photos, rent, amenities and the area of this rental. Unlock the landlord's contact when you are ready.",
      },
      { property: "og:title", content: "Rental details — Pangisa" },
      {
        property: "og:description",
        content: "Photos, rent, amenities and area details for this Ugandan rental.",
      },
    ],
  }),
  component: PropertyDetail,
});

function PropertyDetail() {
  const { propertyId } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useAuthUser();
  const { data: property, isLoading } = useProperty(propertyId);
  const { data: unlock } = useMyUnlock(propertyId, user?.id);
  const isOwner = user?.id && property?.landlord_id === user.id;
  const { data: location } = usePropertyLocation(propertyId, Boolean(unlock || isOwner));
  const photos = usePhotoUrls((property?.property_images ?? []).map((image) => image.url));
  const [active, setActive] = useState(0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const unlockFn = useServerFn(unlockProperty);
  const releaseFn = useServerFn(releaseUnlock);
  const reviewFn = useServerFn(submitSilentReview);

  const unlockMutation = useMutation({
    mutationFn: () => unlockFn({ data: { propertyId } }),
    onSuccess: () => {
      toast.success("Contacts unlocked. The landlord also received your number.");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const releaseMutation = useMutation({
    mutationFn: () => releaseFn({ data: { propertyId } }),
    onSuccess: () => {
      toast.success("Released. This rental is visible to others again.");
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reviewMutation = useMutation({
    mutationFn: () => reviewFn({ data: { propertyId, rating, comment: comment || undefined } }),
    onSuccess: () => toast.success("Thank you. Your review is private to Pangisa."),
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen pb-20">
        <AppHeader title="Rental" back />
        <div className="mx-auto max-w-lg space-y-3 p-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen pb-20">
        <AppHeader title="Rental" back />
        <div className="mx-auto max-w-lg p-6 text-center text-sm text-muted-foreground">
          This rental is no longer available.
          <div className="mt-4">
            <Button asChild>
              <Link to="/browse">Find another home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const fee = accessFee(property.rent_ugx);
  const video = youtubeEmbedUrl(property.video_url);
  const place = [
    property.areas?.name,
    property.areas?.cities?.name,
    property.areas?.cities?.regions?.name,
  ]
    .filter(Boolean)
    .join(", ");

  const facts = [
    { icon: BedDouble, label: `${property.bedrooms} bedrooms` },
    { icon: Bath, label: `${property.bathrooms} bathrooms` },
    { icon: Sofa, label: `${property.sitting_rooms} sitting room(s)` },
    { icon: Car, label: `${property.parking_spaces} parking space(s)` },
    { icon: Droplets, label: property.water_source ?? "Water: ask landlord" },
    { icon: Zap, label: property.power_source ?? "Power: ask landlord" },
  ];

  return (
    <div className="min-h-screen pb-20">
      <AppHeader title={property.title} back />
      <main className="mx-auto max-w-lg">
        <div className="aspect-[4/3] bg-muted">
          {photos.data?.[active] ? (
            <img
              src={photos.data[active]}
              alt={property.title}
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center text-xs text-muted-foreground">
              No photos yet
            </div>
          )}
        </div>
        {(photos.data?.length ?? 0) > 1 ? (
          <div className="flex gap-2 overflow-x-auto p-3">
            {photos.data?.map((url, index) => (
              <button
                key={url}
                type="button"
                onClick={() => setActive(index)}
                className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                  index === active ? "border-primary" : "border-transparent"
                }`}
              >
                <img src={url ?? undefined} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}

        <div className="space-y-5 p-4">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="font-display text-xl font-bold leading-snug">{property.title}</h1>
              {property.landlord_verified ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-verified px-2 py-1 text-[0.65rem] font-semibold text-verified-foreground">
                  <ShieldCheck className="size-3" /> Verified
                </span>
              ) : null}
            </div>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-4" /> {place}
            </p>
            <p className="mt-2 font-display text-2xl font-extrabold text-primary">
              {formatUgx(property.rent_ugx)}
              <span className="text-sm font-medium text-muted-foreground"> / month</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {property.property_type} · {property.furnishing} ·{" "}
              {property.self_contained ? "Self contained" : "Not self contained"} ·{" "}
              {property.deposit_months} month(s) deposit
            </p>
            {property.has_units ? (
              <p className="mt-1 text-xs font-semibold text-accent">
                {property.units_available} of {property.total_units} units still available
              </p>
            ) : null}
          </div>

          {property.description ? (
            <p className="text-sm leading-relaxed text-foreground/90">{property.description}</p>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            {facts.map(({ icon: Icon, label }) => (
              <div key={label} className="surface-card flex items-center gap-2 p-3 text-xs">
                <Icon className="size-4 shrink-0 text-primary" /> {label}
              </div>
            ))}
          </div>

          {property.amenities?.length ? (
            <div>
              <h2 className="font-display text-base font-semibold">What's included</h2>
              <ul className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                {property.amenities.map((item: string) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-primary" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {video ? (
            <div>
              <h2 className="font-display text-base font-semibold">Video tour</h2>
              <div className="mt-2 aspect-video overflow-hidden rounded-xl border border-border">
                <iframe
                  src={video}
                  title="Property video tour"
                  allowFullScreen
                  loading="lazy"
                  className="size-full"
                />
              </div>
            </div>
          ) : null}

          <div>
            <h2 className="font-display text-base font-semibold">Location</h2>
            <p className="mb-2 text-xs text-muted-foreground">
              {unlock || isOwner
                ? location?.address_exact || property.landmark || place
                : `Around ${property.areas?.name}. Exact address is shared after you unlock.`}
            </p>
            <LocationMap
              latitude={location?.latitude ?? null}
              longitude={location?.longitude ?? null}
              label={place}
              exact={Boolean(unlock || isOwner)}
            />
            {property.landmark && !unlock && !isOwner ? (
              <p className="mt-2 text-xs text-muted-foreground">Landmark: {property.landmark}</p>
            ) : null}
          </div>

          {isOwner ? (
            <div className="surface-card p-4 text-sm">
              <p className="font-display font-semibold">This is your listing</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Manage its status and details from your dashboard.
              </p>
              <Button asChild variant="outline" className="mt-3 w-full">
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            </div>
          ) : unlock ? (
            <div className="space-y-4">
              <div className="surface-card space-y-2 p-4">
                <p className="inline-flex items-center gap-2 font-display font-semibold text-primary">
                  <Phone className="size-4" /> Landlord contact
                </p>
                <a
                  href={`tel:${unlock.landlord_phone ?? ""}`}
                  className="block font-display text-lg font-bold"
                >
                  {unlock.landlord_phone ?? "Phone not provided yet"}
                </a>
                <p className="text-xs text-muted-foreground">
                  The landlord also received your number ({unlock.tenant_phone}).
                </p>
              </div>

              <div className="surface-card space-y-3 p-4">
                <p className="font-display font-semibold">Private review</p>
                <p className="text-xs text-muted-foreground">
                  Only Pangisa admins see this. It is never shown to the landlord.
                </p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className={`size-9 rounded-lg border text-sm font-semibold ${
                        rating >= value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <Textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="How was the landlord and the house?"
                  rows={3}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={rating === 0 || reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate()}
                >
                  Send private review
                </Button>
              </div>

              {!unlock.released_by_tenant ? (
                <Button
                  variant="ghost"
                  className="w-full text-xs"
                  disabled={releaseMutation.isPending}
                  onClick={() => releaseMutation.mutate()}
                >
                  I'm not taking this house — release it
                </Button>
              ) : (
                <p className="text-center text-xs text-muted-foreground">
                  You released this rental.
                </p>
              )}
            </div>
          ) : (
            <div className="surface-card space-y-3 p-4">
              <p className="inline-flex items-center gap-2 font-display font-semibold">
                <Lock className="size-4 text-accent" /> Contact the landlord
              </p>
              <p className="text-xs text-muted-foreground">
                One-time access fee. You get the landlord's phone number and exact location, and the
                landlord gets your number. The listing is then held for you.
              </p>
              <p className="font-display text-xl font-bold text-primary">{formatUgx(fee)}</p>
              {user ? (
                <Button
                  className="w-full"
                  disabled={unlockMutation.isPending}
                  onClick={() => unlockMutation.mutate()}
                >
                  {unlockMutation.isPending ? "Processing…" : "Pay and get contact"}
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() =>
                    router.navigate({ to: "/auth", search: { redirect: `/property/${propertyId}` } })
                  }
                >
                  Sign in to continue
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
