import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { childrenOf, useLocationTree, type LocationRow } from "@/lib/locations";

const LEVEL_LABELS = [
  "Region",
  "District / City",
  "Town / Division",
  "Area / Neighbourhood",
  "Village / Estate",
  "More exact place",
];

function LevelSelect({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: LocationRow[];
  selected: LocationRow | null;
  onSelect: (row: LocationRow) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-11 w-full justify-between font-normal"
        >
          <span className={cn(!selected && "text-muted-foreground")}>
            {selected ? selected.name : label}
          </span>
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(22rem,90vw)] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}`} />
          <CommandList>
            <CommandEmpty>Nothing found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  onSelect={() => {
                    onSelect(option);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      selected?.id === option.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Cascading searchable place pickers. Each level only offers places inside the
 * previous choice, and deeper levels appear only where they exist.
 */
export function LocationPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (locationId: string | null) => void;
}) {
  const { data: rows } = useLocationTree();
  const country = (rows ?? []).find((row) => row.type === "country") ?? null;

  const chain = useMemo(() => {
    if (!rows || !value) return [] as LocationRow[];
    const byId = new Map(rows.map((row) => [row.id, row]));
    const out: LocationRow[] = [];
    let current = byId.get(value) ?? null;
    while (current && current.type !== "country") {
      out.unshift(current);
      current = current.parent_id ? (byId.get(current.parent_id) ?? null) : null;
    }
    return out;
  }, [rows, value]);

  const levels: { options: LocationRow[]; selected: LocationRow | null }[] = [];
  let parentId = country?.id ?? null;
  for (let index = 0; index < LEVEL_LABELS.length; index += 1) {
    const options = childrenOf(rows, parentId).filter((row) => row.is_active);
    if (options.length === 0) break;
    const selected = chain[index] ?? null;
    levels.push({ options, selected });
    if (!selected) break;
    parentId = selected.id;
  }

  return (
    <div className="grid gap-3">
      {levels.map((level, index) => (
        <LevelSelect
          key={level.selected?.id ?? `level-${index}`}
          label={LEVEL_LABELS[index] ?? "Place"}
          options={level.options}
          selected={level.selected}
          onSelect={(row) => onChange(row.id)}
        />
      ))}
    </div>
  );
}

/** The chosen place plus its parents, e.g. "Central › Kampala › Nakawa › Ntinda". */
export function useLocationTrail(value: string | null) {
  const { data: rows } = useLocationTree();
  return useMemo(() => {
    if (!rows || !value) return [] as LocationRow[];
    const byId = new Map(rows.map((row) => [row.id, row]));
    const out: LocationRow[] = [];
    let current = byId.get(value) ?? null;
    while (current && current.type !== "country") {
      out.unshift(current);
      current = current.parent_id ? (byId.get(current.parent_id) ?? null) : null;
    }
    return out;
  }, [rows, value]);
}
