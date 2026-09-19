import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Crosshair, ImagePlus, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/pangisa/app-header";
import { BottomNav } from "@/components/pangisa/bottom-nav";
import { MapPicker } from "@/components/pangisa/map-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuthUser } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatUgx, listingFee } from "@/lib/fees";
import { publishProperty } from "@/lib/pangisa.functions";
import { uploadPropertyPhoto } from "@/lib/photos";
import { LocationPicker, useLocationTrail } from "@/components/pangisa/location-picker";
import { childrenOf, useLocationTree } from "@/lib/locations";
import { suggestLocation } from "@/lib/locations.functions";
import {
  AMENITIES,
  FENCE_OPTIONS,
  FURNISHING,
  POWER_SOURCES,
  PROPERTY_TYPES,
  WATER_SOURCES,
} from "@/lib/uganda";

export const Route = createFileRoute("/_authenticated/list-property")({
  head: () => ({
    meta: [
      { title: "List your property — Pangisa" },
      {
        name: "description",
        content:
          "Add your rental, drop its location on the map and go live for 5% of one month's rent.",
      },
      { property: "og:title", content: "List your property — Pangisa" },
      {
        property: "og:description",
        content: "Add your rental and reach genuine tenants directly, no brokers.",
      },
    ],
  }),
  component: ListProperty,
});

function ListProperty() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useAuthUser();
  const { data: locationRows } = useLocationTree();
  const [locationId, setLocationId] = useState<string | null>(null);
  const trail = useLocationTrail(locationId);
  const [missingArea, setMissingArea] = useState("");
  const suggestFn = useServerFn(suggestLocation);
  const suggest = useMutation({
    mutationFn: () => suggestFn({ data: { name: missingArea, parentId: locationId } }),
    onSuccess: () => {
      setMissingArea("");
      toast.success("Thanks — we sent your area to the Pangisa team to add.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    property_type: PROPERTY_TYPES[0] as string,
    rent_ugx: "",
    deposit_months: "1",
    bedrooms: "1",
    bathrooms: "1",
    sitting_rooms: "1",
    self_contained: true,
    furnishing: FURNISHING[0] as string,
    water_source: WATER_SOURCES[0] as string,
    power_source: POWER_SOURCES[0] as string,
    fence_gate: FENCE_OPTIONS[0] as string,
    parking_spaces: "0",
    video_url: "",
    landmark: "",
    has_units: false,
    total_units: "1",
    address_exact: "",
    directions_note: "",
  });
  const [amenities, setAmenities] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const rent = Number(form.rent_ugx) || 0;
  const units = form.has_units ? Math.max(1, Number(form.total_units) || 1) : 1;
  const fee = listingFee(rent, form.has_units, units);

  const publishFn = useServerFn(publishProperty);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in again");
      if (!locationId) throw new Error("Choose the place where the property is");
      if (rent <= 0) throw new Error("Enter the monthly rent");

      const { data: property, error } = await supabase
        .from("properties")
        .insert({
          landlord_id: user.id,
          location_id: locationId,
          title: form.title,
          description: form.description || null,
          property_type: form.property_type,
          rent_ugx: rent,
          deposit_months: Number(form.deposit_months) || 1,
          bedrooms: Number(form.bedrooms) || 1,
          bathrooms: Number(form.bathrooms) || 1,
          sitting_rooms: Number(form.sitting_rooms) || 1,
          self_contained: form.self_contained,
          furnishing: form.furnishing,
          water_source: form.water_source,
          power_source: form.power_source,
          fence_gate: form.fence_gate,
          parking_spaces: Number(form.parking_spaces) || 0,
          amenities,
          video_url: form.video_url || null,
          landmark: form.landmark || null,
          has_units: form.has_units,
          total_units: units,
          units_available: units,
        })
        .select("id")
        .single();
      if (error) throw new Error(`Listing could not be saved: ${error.message}`);

      try {
        for (const [index, file] of files.entries()) {
          const path = await uploadPropertyPhoto(user.id, file);
          const { error: imageError } = await supabase
            .from("property_images")
            .insert({ property_id: property.id, url: path, sort_order: index });
          if (imageError) throw new Error(`Photo ${index + 1} could not be saved: ${imageError.message}`);
        }

        if (pin || form.address_exact || form.directions_note) {
          const { error: locationError } = await supabase.from("property_locations").upsert({
            property_id: property.id,
            latitude: pin?.lat ?? null,
            longitude: pin?.lng ?? null,
            address_exact: form.address_exact || null,
            directions_note: form.directions_note || null,
          });
          if (locationError) throw new Error(`Location could not be saved: ${locationError.message}`);
        }

        await publishFn({ data: { propertyId: property.id } });
        return property.id;
      } catch (error) {
        await supabase.from("properties").delete().eq("id", property.id).eq("landlord_id", user.id);
        throw error;
      }
    },
    onSuccess: (id) => {
      toast.success(`Your listing is live. Listing fee ${formatUgx(fee.total)}.`);
      queryClient.invalidateQueries();
      router.navigate({ to: "/property/$propertyId", params: { propertyId: id } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function dropPin() {
    if (!navigator.geolocation) {
      toast.error("Your phone does not support location. Tap the map to drop the pin instead.");
      return;
    }
    setLocating(true);
    const onSuccess = (position: GeolocationPosition) => {
      setPin({ lat: position.coords.latitude, lng: position.coords.longitude });
      setLocating(false);
      toast.success("Location pinned. Drag the pin to fine-tune the exact spot.");
    };
    const onFailure = (error: GeolocationPositionError) => {
      // High-accuracy GPS can time out indoors — retry once with a rougher fix.
      if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
        navigator.geolocation.getCurrentPosition(onSuccess, onFinalFailure, {
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 60000,
        });
        return;
      }
      onFinalFailure(error);
    };
    const onFinalFailure = (error: GeolocationPositionError) => {
      setLocating(false);
      if (error.code === error.PERMISSION_DENIED) {
        toast.error(
          "Location permission is blocked. Allow location for this site in your browser settings, or tap the map to drop the pin.",
        );
      } else {
        toast.error("Could not read your location. Tap the map to drop the pin instead.");
      }
    };
    navigator.geolocation.getCurrentPosition(onSuccess, onFailure, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  }

  const hasDeeperPlaces = locationId
    ? childrenOf(locationRows, locationId).some((row) => row.is_active)
    : false;

  return (
    <div className="min-h-screen pb-24">
      <AppHeader title="List your property" back />
      <main className="mx-auto max-w-lg space-y-6 p-4">
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold">Where is it?</h2>
          <LocationPicker value={locationId} onChange={setLocationId} />
          {trail.length ? (
            <p className="text-xs text-muted-foreground">
              {trail.map((step) => step.name).join(" › ")}
            </p>
          ) : null}
          {locationId && !hasDeeperPlaces ? (
            <div className="surface-card space-y-2 p-3.5">
              <p className="text-xs font-semibold">Can&apos;t find your area?</p>
              <p className="text-xs text-muted-foreground">
                Type it and we&apos;ll review it. Your listing still uses the place you picked
                above.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Kyaliwajjala"
                  value={missingArea}
                  onChange={(event) => setMissingArea(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={missingArea.trim().length < 2 || suggest.isPending}
                  onClick={() => suggest.mutate()}
                >
                  Send
                </Button>
              </div>
            </div>
          ) : null}

          <div className="surface-card space-y-3 p-4">
            <p className="text-xs text-muted-foreground">
              Drop the exact spot while standing at the property. Tenants only see the area until
              they pay for access.
            </p>
            <Button type="button" variant="outline" className="w-full" onClick={dropPin}>
              {locating ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Crosshair className="mr-2 size-4" />
              )}
              {pin ? "Use my current location again" : "Drop my current location"}
            </Button>
            <MapPicker value={pin} onChange={setPin} />
            <p className="text-xs text-muted-foreground">
              {pin
                ? `Pin set at ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)} — tap the map or drag the pin to adjust.`
                : "Or tap the map exactly where the property is."}
            </p>
            <Input
              placeholder="Exact address (plot, road, zone)"
              value={form.address_exact}
              onChange={(event) => setForm({ ...form, address_exact: event.target.value })}
            />
            <Input
              placeholder="Directions note (e.g. behind Kisaasi stage)"
              value={form.directions_note}
              onChange={(event) => setForm({ ...form, directions_note: event.target.value })}
            />
            <Input
              placeholder="Public landmark shown to everyone"
              value={form.landmark}
              onChange={(event) => setForm({ ...form, landmark: event.target.value })}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold">The house</h2>
          <div className="space-y-1.5">
            <Label htmlFor="title">Listing title</Label>
            <Input
              id="title"
              placeholder="2 bedroom apartment in Kisaasi"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </div>
          <Textarea
            rows={4}
            placeholder="Describe the house, the compound and the neighbourhood."
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              value={form.property_type}
              onValueChange={(value) => setForm({ ...form, property_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Property type" />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={form.furnishing}
              onValueChange={(value) => setForm({ ...form, furnishing: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Furnishing" />
              </SelectTrigger>
              <SelectContent>
                {FURNISHING.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <NumberField
              label="Monthly rent (UGX)"
              value={form.rent_ugx}
              onChange={(value) => setForm({ ...form, rent_ugx: value })}
            />
            <NumberField
              label="Deposit (months)"
              value={form.deposit_months}
              onChange={(value) => setForm({ ...form, deposit_months: value })}
            />
            <NumberField
              label="Bedrooms"
              value={form.bedrooms}
              onChange={(value) => setForm({ ...form, bedrooms: value })}
            />
            <NumberField
              label="Bathrooms"
              value={form.bathrooms}
              onChange={(value) => setForm({ ...form, bathrooms: value })}
            />
            <NumberField
              label="Sitting rooms"
              value={form.sitting_rooms}
              onChange={(value) => setForm({ ...form, sitting_rooms: value })}
            />
            <NumberField
              label="Parking spaces"
              value={form.parking_spaces}
              onChange={(value) => setForm({ ...form, parking_spaces: value })}
            />
            <Select
              value={form.water_source}
              onValueChange={(value) => setForm({ ...form, water_source: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Water" />
              </SelectTrigger>
              <SelectContent>
                {WATER_SOURCES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={form.power_source}
              onValueChange={(value) => setForm({ ...form, power_source: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Power" />
              </SelectTrigger>
              <SelectContent>
                {POWER_SOURCES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={form.fence_gate}
              onValueChange={(value) => setForm({ ...form, fence_gate: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Fence and gate" />
              </SelectTrigger>
              <SelectContent>
                {FENCE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="surface-card flex items-center justify-between p-3.5 text-sm">
            Self contained
            <Switch
              checked={form.self_contained}
              onCheckedChange={(checked) => setForm({ ...form, self_contained: checked })}
            />
          </label>

          <div className="surface-card space-y-3 p-3.5 text-sm">
            <label className="flex items-center justify-between">
              Several identical units (muzigo, hostel, apartments)
              <Switch
                checked={form.has_units}
                onCheckedChange={(checked) => setForm({ ...form, has_units: checked })}
              />
            </label>
            {form.has_units ? (
              <NumberField
                label="How many units?"
                value={form.total_units}
                onChange={(value) => setForm({ ...form, total_units: value })}
              />
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="video">YouTube video (optional)</Label>
            <Input
              id="video"
              placeholder="https://youtube.com/watch?v=…"
              value={form.video_url}
              onChange={(event) => setForm({ ...form, video_url: event.target.value })}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold">What's included</h2>
          <div className="grid grid-cols-2 gap-2">
            {AMENITIES.map((item) => (
              <label key={item} className="flex items-start gap-2 text-xs">
                <Checkbox
                  checked={amenities.includes(item)}
                  onCheckedChange={(checked) =>
                    setAmenities(
                      checked ? [...amenities, item] : amenities.filter((value) => value !== item),
                    )
                  }
                />
                {item}
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold">Photos</h2>
          <label className="surface-card flex cursor-pointer items-center gap-3 p-4 text-sm">
            <ImagePlus className="size-5 text-primary" />
            <span className="flex-1">
              {files.length > 0 ? `${files.length} photo(s) selected` : "Add photos of the house"}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            />
          </label>
        </section>

        <section className="surface-card space-y-2 p-4">
          <h2 className="font-display text-lg font-bold">Go live</h2>
          <p className="text-xs text-muted-foreground">
            Listing fee is 5% of one month's rent{form.has_units ? ", per unit with a discount" : ""}
            . Paid once when the listing goes live.
          </p>
          <p className="font-display text-2xl font-extrabold text-primary">
            {formatUgx(fee.total)}
          </p>
          {form.has_units ? (
            <p className="text-xs text-muted-foreground">
              {units} units × {formatUgx(fee.perUnit)} each (discount applied)
            </p>
          ) : null}
          <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Publishing…" : "Pay and publish"}
          </Button>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}

function NumberField({
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
      <Input
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/[^0-9]/g, ""))}
      />
    </div>
  );
}
