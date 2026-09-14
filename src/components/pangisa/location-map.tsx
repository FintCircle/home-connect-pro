import { ExternalLink, MapPin } from "lucide-react";

/**
 * Area-level or exact map preview. Uses a keyless OpenStreetMap tile embed so the
 * map works everywhere, plus a direct "open in Google Maps" link for directions.
 */
export function LocationMap({
  latitude,
  longitude,
  label,
  exact,
}: {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  label: string;
  exact?: boolean;
}) {
  if (latitude == null || longitude == null) {
    return (
      <div className="surface-card grid h-40 place-items-center text-center text-xs text-muted-foreground">
        <span>
          <MapPin className="mx-auto mb-1 size-4" />
          Map pin not set yet
        </span>
      </div>
    );
  }

  const span = exact ? 0.008 : 0.03;
  const bbox = [longitude - span, latitude - span / 2, longitude + span, latitude + span / 2].join(
    ",",
  );

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-border">
        <iframe
          title={`Map of ${label}`}
          loading="lazy"
          className="h-48 w-full"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`}
        />
      </div>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary"
      >
        Open in Google Maps <ExternalLink className="size-3.5" />
      </a>
    </div>
  );
}

export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}
