/**
 * Cache tags. BilBoost sends BB ids, never tags; the names live here only.
 *
 *   bb:{siteKey}            every car-related response (catch-all)
 *   bb:{siteKey}:list       list pages (all query variants), the car sitemap
 *   bb:{siteKey}:car:bb-12  one detail page, including its 404/410 variants
 */
export const MAX_IDS_PER_PUSH = 90;

export const tagsFor = (siteKey: string) => {
  const all = `bb:${siteKey}`;
  return {
    all,
    list: `${all}:list`,
    car: (bilboostId: string) => `${all}:car:${bilboostId.toLowerCase()}`,
  };
};

/** Which tags a push purges. Over the id cap, or `scope: "all"`, everything. */
export const tagsForPush = (siteKey: string, scope: "cars" | "all", ids: string[]): string[] => {
  const t = tagsFor(siteKey);
  if (scope === "all" || ids.length === 0 || ids.length > MAX_IDS_PER_PUSH) return [t.all];
  return [t.list, ...ids.map((id) => t.car(id))];
};
