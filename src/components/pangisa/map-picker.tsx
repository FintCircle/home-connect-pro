import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: any;
    initPangisaMapPicker?: () => void;
  }
}

export type LatLng = { lat: number; lng: number };

const KAMPALA: LatLng = { lat: 0.3476, lng: 32.5825 };

let scriptPromise: Promise<void> | null = null;

function loadMapsScript(): Promise<void> {
  if (typeof window !== "undefined" && window.google?.maps) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    window.initPangisaMapPicker = () => resolve();
    const script = document.createElement("script");
    const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"];
    const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"];
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=initPangisaMapPicker&channel=${channel}`;
    script.async = true;
    script.onerror = () => reject(new Error("map script failed to load"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Interactive Google Map for dropping the exact property pin.
 * Tap anywhere on the map or drag the marker to set the exact spot.
 */
export function MapPicker({
  value,
  onChange,
  className = "h-56 w-full",
}: {
  value: LatLng | null;
  onChange: (point: LatLng) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadMapsScript()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current || !window.google?.maps) return;
        const center = value ?? KAMPALA;
        const map = new window.google.maps.Map(containerRef.current, {
          center,
          zoom: value ? 17 : 12,
          clickableIcons: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;
        map.addListener("click", (event: any) => {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          onChange({ lat, lng });
        });
        if (value) placeMarker(value);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function placeMarker(point: LatLng) {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;
    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        map,
        draggable: true,
        position: point,
      });
      markerRef.current.addListener("dragend", () => {
        const position = markerRef.current.getPosition();
        onChange({ lat: position.lat(), lng: position.lng() });
      });
    } else {
      markerRef.current.setPosition(point);
    }
  }

  // Keep the marker and view in sync when the pin moves (e.g. "use my location").
  useEffect(() => {
    if (!value || !mapRef.current) return;
    placeMarker(value);
    mapRef.current.panTo(value);
    if ((mapRef.current.getZoom() ?? 0) < 15) mapRef.current.setZoom(17);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng]);

  if (failed) {
    return (
      <div className={`grid place-items-center rounded-xl border border-border bg-muted text-xs text-muted-foreground ${className}`}>
        Map could not load. You can still type the exact address below.
      </div>
    );
  }

  return <div ref={containerRef} className={`rounded-xl border border-border ${className}`} />;
}
