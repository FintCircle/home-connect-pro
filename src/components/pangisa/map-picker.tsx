import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    L?: any;
  }
}

export type LatLng = { lat: number; lng: number };

const KAMPALA: LatLng = { lat: 0.3476, lng: 32.5825 };
const LEAFLET = "https://unpkg.com/leaflet@1.9.4/dist";

let loader: Promise<void> | null = null;

function loadLeaflet(): Promise<void> {
  if (window.L) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = `${LEAFLET}/leaflet.css`;
    document.head.appendChild(css);
    const script = document.createElement("script");
    script.src = `${LEAFLET}/leaflet.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loader = null;
      reject(new Error("map failed to load"));
    };
    document.head.appendChild(script);
  });
  return loader;
}

/**
 * OpenStreetMap picker. Tap the map or drag the pin to mark the exact spot —
 * the fallback when the automatic location is missing or off.
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
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [failed, setFailed] = useState(false);

  function placeMarker(point: LatLng) {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;
    if (!markerRef.current) {
      const icon = L.icon({
        iconUrl: `${LEAFLET}/images/marker-icon.png`,
        iconRetinaUrl: `${LEAFLET}/images/marker-icon-2x.png`,
        shadowUrl: `${LEAFLET}/images/marker-shadow.png`,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });
      markerRef.current = L.marker([point.lat, point.lng], { draggable: true, icon }).addTo(map);
      markerRef.current.on("dragend", () => {
        const p = markerRef.current.getLatLng();
        onChangeRef.current({ lat: p.lat, lng: p.lng });
      });
    } else {
      markerRef.current.setLatLng([point.lat, point.lng]);
    }
  }

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const L = window.L;
        const center = value ?? KAMPALA;
        const map = L.map(containerRef.current).setView([center.lat, center.lng], value ? 17 : 12);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);
        map.on("click", (event: any) => onChangeRef.current({ lat: event.latlng.lat, lng: event.latlng.lng }));
        mapRef.current = map;
        if (value) placeMarker(value);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
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
      <div ref={containerRef} className={`relative z-0 rounded-xl border border-border ${className}`} />
      <p className="text-xs text-muted-foreground">
        Location off or the pin is wrong? Tap the map to mark the spot, or drag the pin.
      </p>
    </div>
  );
}
