import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapPicker, type LatLng } from "@/components/pangisa/map-picker";

export const Route = createFileRoute("/maptest")({ component: T });

function T() {
  const [pin, setPin] = useState<LatLng | null>({ lat: 0.3476, lng: 32.5825 });
  return (
    <div className="p-6">
      <MapPicker value={pin} onChange={setPin} />
      <p id="pin">{pin ? `${pin.lat},${pin.lng}` : "none"}</p>
    </div>
  );
}
