/**
 * "Notify me" on items that are out of stock. The request goes to
 * public/api/restock/request.php, where the shop owner sees it under
 * "Restock requests" and can tell everyone who asked once it's back.
 * Which items this browser asked about is remembered here, so the button
 * keeps saying so.
 */
import { API_ORIGIN, idToken, hasLiveSession } from "./shopperAuth";

const KEY = "dashit_restock_requests";
const EVENT = "dashit_restock_updated";

function readIds() {
  if (typeof window === "undefined") return [];
  try {
    const ids = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(ids) ? ids.map(String) : [];
  } catch (e) {
    return [];
  }
}

function writeIds(ids) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids.slice(-300)));
    window.dispatchEvent(new Event(EVENT));
  } catch (e) {}
}

export function hasAskedForRestock(productId) {
  return readIds().includes(String(productId));
}

export function onRestockChange(listener) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

/**
 * Asks to be told when the item is back ("add"), or takes that back ("remove").
 * Throws { needsSignIn: true } when nobody is signed in.
 */
export async function setRestockRequest(productId, wanted = true) {
  const id = String(productId || "");
  if (!id) throw new Error("That item is not valid.");
  if (!(await hasLiveSession())) throw Object.assign(new Error("Please sign in first."), { needsSignIn: true });
  const response = await fetch(`${API_ORIGIN}/api/restock/request.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: await idToken(), productId: id, action: wanted ? "add" : "remove" }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || "Couldn't save that. Please try again."), { needsSignIn: response.status === 401 });
  const ids = readIds().filter((x) => x !== id);
  writeIds(wanted ? [...ids, id] : ids);
  return wanted;
}
