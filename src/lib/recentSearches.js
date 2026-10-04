/**
 * What this shopper searched for lately, kept on this device only
 * (localStorage). Newest first, no repeats, a short list.
 */
const KEY = "dashit_recent_searches";
const LIMIT = 8;

export function getRecentSearches() {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((s) => typeof s === "string" && s.trim()).slice(0, LIMIT) : [];
  } catch (e) {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, LIMIT)));
  } catch (e) {}
  return list.slice(0, LIMIT);
}

/** Puts a search at the top of the list. Returns the new list. */
export function addRecentSearch(text) {
  const term = String(text || "").trim().replace(/\s+/g, " ");
  if (term.length < 2) return getRecentSearches();
  // "mil" then "milk": the longer search replaces the half-typed one.
  const lower = term.toLowerCase();
  const rest = getRecentSearches().filter((s) => !lower.startsWith(s.toLowerCase()));
  return save([term, ...rest]);
}

export function removeRecentSearch(text) {
  return save(getRecentSearches().filter((s) => s !== text));
}

export function clearRecentSearches() {
  return save([]);
}
