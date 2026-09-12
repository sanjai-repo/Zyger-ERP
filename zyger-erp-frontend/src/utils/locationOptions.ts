export interface LocationOption {
  code: string;
  name?: string;
}

/**
 * FRS DOC-INV-FRS-02 §2.3 / Priority #1 root cause — `store_master` and `location_master`
 * are two separate tables with disjoint code spaces (confirmed live: store_master only has
 * STORE-01/STORE-02, while most real posted stock sits under location_master codes like
 * RM-A-01/RM-A-12, or under the legacy "MAIN" fallback — see mainOrEmptyLocationCode below).
 *
 * Every OUT-effect form used to pick ONE list or the other — `stores.length > 0 ? stores :
 * locations` — so the moment even a single store_master row existed, every location_master
 * code (and the real stock sitting under it) silently disappeared from the dropdown. A user
 * could then only ever select a store where that item genuinely had zero stock, which looked
 * exactly like "Available Stock defaults to the wrong value."
 *
 * This merges both lists into one, store_master entries first (they're the FRS-canonical
 * source going forward) with location_master entries appended for any code not already
 * present, so every location real stock can be sitting under stays selectable.
 */
export function mergeLocationOptions(
  stores: readonly LocationOption[] | undefined | null,
  locations: readonly LocationOption[] | undefined | null
): LocationOption[] {
  const merged: LocationOption[] = [];
  const seen = new Set<string>();

  for (const s of stores ?? []) {
    if (!s?.code || seen.has(s.code)) continue;
    seen.add(s.code);
    merged.push(s);
  }
  for (const l of locations ?? []) {
    if (!l?.code || seen.has(l.code)) continue;
    seen.add(l.code);
    merged.push(l);
  }
  return merged;
}
