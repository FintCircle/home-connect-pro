import { Link } from "@tanstack/react-router";
import { BedDouble, Bath, Car, ShieldCheck, MapPin } from "lucide-react";

import { formatUgx } from "@/lib/fees";
import { pathLabel } from "@/lib/locations";
import { usePhotoUrls } from "@/lib/photos";

export type PropertyCardData = {
  id: string;
  title: string;
  rent_ugx: number;
  bedrooms: number;
  bathrooms: number;
  parking_spaces: number;
  landlord_verified: boolean;
  has_units: boolean;
  units_available: number;
  locations?: { name: string; full_path: string | null } | null;
  areas?: { name: string; cities?: { name: string } | null } | null;
  property_images?: { url: string }[];
};

export function PropertyCard({ property }: { property: PropertyCardData }) {
  const firstPhoto = property.property_images?.[0]?.url;
  const { data: urls } = usePhotoUrls(firstPhoto ? [firstPhoto] : []);
  const photo = urls?.[0];
  const place = property.locations
    ? pathLabel(property.locations.full_path, 3) || property.locations.name
    : [property.areas?.name, property.areas?.cities?.name].filter(Boolean).join(", ");

  return (
    <Link
      to="/property/$propertyId"
      params={{ propertyId: property.id }}
      className="surface-card block overflow-hidden"
    >
      <div className="relative aspect-[4/3] bg-muted">
        {photo ? (
          <img
            src={photo}
            alt={property.title}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center text-xs text-muted-foreground">
            No photo yet
          </div>
        )}
        {property.landlord_verified ? (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-verified px-2 py-1 text-[0.65rem] font-semibold text-verified-foreground">
            <ShieldCheck className="size-3" /> Verified landlord
          </span>
        ) : null}
        {property.has_units ? (
          <span className="absolute right-2 top-2 rounded-full bg-card/90 px-2 py-1 text-[0.65rem] font-semibold">
            {property.units_available} units left
          </span>
        ) : null}
      </div>
      <div className="space-y-1.5 p-3.5">
        <h3 className="font-display text-[0.95rem] font-semibold leading-snug">{property.title}</h3>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3.5" /> {place}
        </p>
        <p className="font-display text-base font-bold text-primary">
          {formatUgx(property.rent_ugx)}
          <span className="text-xs font-medium text-muted-foreground"> / month</span>
        </p>
        <div className="flex flex-wrap gap-3 pt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <BedDouble className="size-3.5" /> {property.bedrooms} bed
          </span>
          <span className="inline-flex items-center gap-1">
            <Bath className="size-3.5" /> {property.bathrooms} bath
          </span>
          {property.parking_spaces > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Car className="size-3.5" /> Parking
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
