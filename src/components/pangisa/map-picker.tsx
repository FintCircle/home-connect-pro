import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";

export type LatLng = { lat: number; lng: number };

const KAMPALA: LatLng = { lat: 0.3476, lng: 32.5825 };
const MARKER = "https://unpkg.com/leaflet@1.9.4/dist/images";

/**
 * OpenStreetMap picker. Starts on the given coordinates (or the device's
 * location), and lets the owner tap the map or drag the pin to mark the spot.
 */
export function MapPicker({
  value,
  onChange,
  className = "h-64 w-full",
}: {
  value: LatLng | null;
  onChange: (point: LatLng) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerRef = useRef<Leaflet.Marker | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [failed, setFailed] = useState(false);

  function placeMarker(point: LatLng) {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (!markerRef.current) {
      const icon = L.icon({
        iconUrl: `${MARKER}/marker-icon.png`,
        iconRetinaUrl: `${MARKER}/marker-icon-2x.png`,
        shadowUrl: `${MARKER}/marker-shadow.png`,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        shadowSize: [41, 41],
      });
      const marker = L.marker([point.lat, point.lng], { draggable: true, icon }).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        onChangeRef.current({ lat: p.lat, lng: p.lng });
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng([point.lat, point.lng]);
    }
  }

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;

    import("leaflet")
      .then((mod) => {
        const L = ((mod as any).default ?? mod) as typeof Leaflet;
        if (cancelled || !containerRef.current || mapRef.current) return;
        leafletRef.current = L;
        const start = valueRef.current ?? KAMPALA;
        const map = L.map(containerRef.current, { zoomControl: true }).setView(
          [start.lat, start.lng],
          valueRef.current ? 17 : 13,
        );
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);
        map.on("click", (event: Leaflet.LeafletMouseEvent) =>
          onChangeRef.current({ lat: event.latlng.lat, lng: event.latlng.lng }),
        );
        mapRef.current = map;
        if (valueRef.current) placeMarker(valueRef.current);

        // The card can change size after mount — keep tiles filling the box.
        observer = new ResizeObserver(() => map.invalidateSize());
        observer.observe(containerRef.current);
        setTimeout(() => map.invalidateSize(), 250);

        // No pin yet: open the map on the device's location when allowed.
        if (!valueRef.current && "geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              if (cancelled || valueRef.current || !mapRef.current) return;
              mapRef.current.setView([position.coords.latitude, position.coords.longitude], 16);
            },
            () => undefined,
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
          );
        }
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      observer?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!value || !mapRef.current) return;
    placeMarker(value);
    const zoom = Math.max(mapRef.current.getZoom() ?? 0, 17);
    mapRef.current.setView([value.lat, value.lng], zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng]);

  if (failed) {
    return (
      <div className={`grid place-items-center rounded-xl border border-border bg-muted text-xs text-muted-foreground ${className}`}>
        Map could not load. You can still type the exact address below.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div
        ref={containerRef}
        className={`relative z-0 overflow-hidden rounded-xl border border-border bg-muted ${className}`}
      />
      <p className="text-xs text-muted-foreground">
        Location off or the pin is wrong? Tap the map to mark the spot, or drag the pin.
      </p>
    </div>
  );
}
