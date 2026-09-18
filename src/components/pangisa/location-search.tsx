import { useNavigate } from "@tanstack/react-router";
import { MapPin, Search } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { useLocationSearch } from "@/lib/locations";

/** One box: type any place in Uganda and jump straight to its rentals. */
export function LocationSearch({ placeholder = "Search any area, town or district" }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const { data: results, isFetching } = useLocationSearch(term);
  const open = term.trim().length >= 2;

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder={placeholder}
        className="h-12 pl-9"
        aria-label="Search for a place"
      />
      {open ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border bg-card shadow-lg">
          {results?.length ? (
            <ul className="max-h-72 overflow-y-auto">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setTerm("");
                      void navigate({ to: "/homes/$", params: { _splat: result.full_path ?? "" } });
                    }}
                  >
                    <MapPin className="size-4 shrink-0 text-primary" />
                    <span>{result.label ?? result.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              {isFetching ? "Searching…" : "No place matches that yet."}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
