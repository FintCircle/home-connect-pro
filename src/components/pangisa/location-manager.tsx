import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, GitMerge, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { childrenOf, useAllLocations, type LocationRow } from "@/lib/locations";
import {
  deleteLocation,
  mergeLocation,
  reviewSuggestion,
  saveLocation,
  setLocationActive,
} from "@/lib/locations.functions";

const TYPES = [
  "country",
  "region",
  "district",
  "city",
  "municipality",
  "town",
  "division",
  "area",
  "neighborhood",
  "village",
] as const;

type Draft = {
  id?: string;
  name: string;
  slug: string;
  type: (typeof TYPES)[number];
  parentId: string | null;
  isActive: boolean;
  sortOrder: string;
};

function emptyDraft(parentId: string | null): Draft {
  return {
    name: "",
    slug: "",
    type: "neighborhood",
    parentId,
    isActive: true,
    sortOrder: "0",
  };
}

export function LocationManager() {
  const queryClient = useQueryClient();
  const { data: rows, isLoading } = useAllLocations();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [mergeFrom, setMergeFrom] = useState<LocationRow | null>(null);
  const [mergeInto, setMergeInto] = useState<string>("");

  const saveFn = useServerFn(saveLocation);
  const activeFn = useServerFn(setLocationActive);
  const mergeFn = useServerFn(mergeLocation);
  const deleteFn = useServerFn(deleteLocation);
  const reviewFn = useServerFn(reviewSuggestion);

  const listingCounts = useQuery({
    queryKey: ["admin-location-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("location_id");
      if (error) throw error;
      const direct: Record<string, number> = {};
      for (const row of data ?? []) {
        if (row.location_id) direct[row.location_id] = (direct[row.location_id] ?? 0) + 1;
      }
      return direct;
    },
  });

  const suggestions = useQuery({
    queryKey: ["admin-location-suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("location_suggestions")
        .select("id, raw_name, note, status, parent_location_id, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["locations"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-location-counts"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-location-suggestions"] });
    void queryClient.invalidateQueries({ queryKey: ["location-counts"] });
  };

  const save = useMutation({
    mutationFn: (input: Draft) =>
      saveFn({
        data: {
          ...(input.id ? { id: input.id } : {}),
          name: input.name,
          slug: input.slug || undefined,
          type: input.type,
          parentId: input.parentId,
          isActive: input.isActive,
          sortOrder: Number(input.sortOrder) || 0,
        },
      }),
    onSuccess: () => {
      toast.success("Place saved");
      setDraft(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleActive = useMutation({
    mutationFn: (input: { id: string; isActive: boolean }) => activeFn({ data: input }),
    onSuccess: (_result, input) => {
      toast.success(input.isActive ? "Place switched on" : "Place switched off");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const merge = useMutation({
    mutationFn: (input: { fromId: string; intoId: string }) => mergeFn({ data: input }),
    onSuccess: () => {
      toast.success("Merged — listings moved and the duplicate is switched off");
      setMergeFrom(null);
      setMergeInto("");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Place removed");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const review = useMutation({
    mutationFn: (input: { id: string; decision: "approved" | "dismissed"; parentId?: string }) =>
      reviewFn({ data: input }),
    onSuccess: (result) => {
      toast.success(
        result.decision === "approved" ? "Area added to Pangisa" : "Suggestion dismissed",
      );
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const flat = useMemo(() => {
    const out: { row: LocationRow; depth: number }[] = [];
    const walk = (parentId: string | null, depth: number) => {
      for (const row of childrenOf(rows, parentId)) {
        out.push({ row, depth });
        walk(row.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [rows]);

  const totals = useMemo(() => {
    const direct = listingCounts.data ?? {};
    const parentOf = new Map((rows ?? []).map((row) => [row.id, row.parent_id]));
    const total: Record<string, number> = {};
    for (const [id, count] of Object.entries(direct)) {
      let current: string | null | undefined = id;
      const seen = new Set<string>();
      while (current && !seen.has(current)) {
        seen.add(current);
        total[current] = (total[current] ?? 0) + count;
        current = parentOf.get(current) ?? null;
      }
    }
    return total;
  }, [listingCounts.data, rows]);

  const options = flat.map(({ row, depth }) => ({
    id: row.id,
    label: `${"— ".repeat(depth)}${row.name}`,
  }));

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">Locations ({flat.length})</h2>
        <Button size="sm" onClick={() => setDraft(emptyDraft(null))}>
          <Plus className="mr-1 size-4" /> Add place
        </Button>
      </div>

      {suggestions.data?.length ? (
        <div className="surface-card space-y-3 p-4">
          <h3 className="font-display text-sm font-semibold">
            Areas suggested by users ({suggestions.data.length})
          </h3>
          {suggestions.data.map((item) => (
            <SuggestionRow
              key={item.id}
              suggestion={item}
              options={options}
              onDecide={(decision, parentId) =>
                review.mutate({ id: item.id, decision, ...(parentId ? { parentId } : {}) })
              }
            />
          ))}
        </div>
      ) : null}

      <div className="surface-card divide-y">
        {flat.map(({ row, depth }) => (
          <div key={row.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
            <span className="flex-1" style={{ paddingLeft: `${depth * 14}px` }}>
              <span className={row.is_active ? "font-medium" : "font-medium text-muted-foreground line-through"}>
                {row.name}
              </span>
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[0.6rem] uppercase tracking-wide">
                {row.type}
              </span>
              <span className="block text-[0.7rem] text-muted-foreground">
                /{row.full_path} · {totals[row.id] ?? 0} listings
              </span>
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Add a place inside ${row.name}`}
                onClick={() => setDraft(emptyDraft(row.id))}
              >
                <Plus className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Edit ${row.name}`}
                onClick={() =>
                  setDraft({
                    id: row.id,
                    name: row.name,
                    slug: row.slug,
                    type: row.type as Draft["type"],
                    parentId: row.parent_id,
                    isActive: row.is_active,
                    sortOrder: String(row.sort_order),
                  })
                }
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={row.is_active ? `Switch off ${row.name}` : `Switch on ${row.name}`}
                onClick={() => toggleActive.mutate({ id: row.id, isActive: !row.is_active })}
              >
                {row.is_active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Merge ${row.name} into another place`}
                onClick={() => {
                  setMergeFrom(row);
                  setMergeInto("");
                }}
              >
                <GitMerge className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Delete ${row.name}`}
                onClick={() => {
                  if ((totals[row.id] ?? 0) > 0) {
                    toast.error(
                      "This place has listings. Switch it off or merge it into the correct place.",
                    );
                    return;
                  }
                  remove.mutate(row.id);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={Boolean(draft)} onOpenChange={(open) => (open ? null : setDraft(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit place" : "Add place"}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Web address (leave blank to build it from the name)</Label>
                <Input
                  value={draft.slug}
                  onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Kind</Label>
                <Select
                  value={draft.type}
                  onValueChange={(value) => setDraft({ ...draft, type: value as Draft["type"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Inside</Label>
                <Select
                  value={draft.parentId ?? "none"}
                  onValueChange={(value) =>
                    setDraft({ ...draft, parentId: value === "none" ? null : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nothing (top level)</SelectItem>
                    {options.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Order</Label>
                  <Input
                    value={draft.sortOrder}
                    onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Shown to users</Label>
                  <Select
                    value={draft.isActive ? "yes" : "no"}
                    onValueChange={(value) => setDraft({ ...draft, isActive: value === "yes" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              disabled={!draft?.name.trim() || save.isPending}
              onClick={() => draft && save.mutate(draft)}
            >
              Save place
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(mergeFrom)} onOpenChange={(open) => (open ? null : setMergeFrom(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge {mergeFrom?.name} into…</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Listings and places inside {mergeFrom?.name} move to the place you choose, and{" "}
            {mergeFrom?.name} is switched off.
          </p>
          <Select value={mergeInto} onValueChange={setMergeInto}>
            <SelectTrigger>
              <SelectValue placeholder="Choose the correct place" />
            </SelectTrigger>
            <SelectContent>
              {options
                .filter((option) => option.id !== mergeFrom?.id)
                .map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              disabled={!mergeInto || merge.isPending}
              onClick={() =>
                mergeFrom && merge.mutate({ fromId: mergeFrom.id, intoId: mergeInto })
              }
            >
              Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function SuggestionRow({
  suggestion,
  options,
  onDecide,
}: {
  suggestion: {
    id: string;
    raw_name: string;
    note: string | null;
    parent_location_id: string | null;
  };
  options: { id: string; label: string }[];
  onDecide: (decision: "approved" | "dismissed", parentId?: string) => void;
}) {
  const [parentId, setParentId] = useState(suggestion.parent_location_id ?? "");
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm font-semibold">{suggestion.raw_name}</p>
      {suggestion.note ? (
        <p className="text-xs text-muted-foreground">{suggestion.note}</p>
      ) : null}
      <Select value={parentId} onValueChange={setParentId}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder="Put it inside…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Button size="sm" disabled={!parentId} onClick={() => onDecide("approved", parentId)}>
          Add it
        </Button>
        <Button size="sm" variant="outline" onClick={() => onDecide("dismissed")}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
