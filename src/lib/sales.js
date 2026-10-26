/**
 * Sales: the banners at the top of the shop (`offers` on Firestore) with a
 * photo, what they are about, what they apply to and when they run.
 *
 * Fields the shop apps already read: badge, title, subtitle, priceTag,
 * category, promoCode, discountPercent, expiresIn, img, active, minOrder.
 * Added for sales: `appliesTo` ("all" or "category"; tapping the banner opens
 * that category, or the whole shop's best deals), `startsAt` and `endsAt`
 * (epoch milliseconds; missing means no start / no end). The same rules are
 * in `Offer.swift` (iPhone) and `Offer.kt` (Android).
 */

export const SALE_ALL = "All";

/** Is the sale on screen for shoppers at `now`: switched on, started and not over. */
export function isSaleLive(offer, now = Date.now()) {
  if (!offer || offer.active === false) return false;
  const starts = Number(offer.startsAt) || 0;
  const ends = Number(offer.endsAt) || 0;
  if (starts && now < starts) return false;
  if (ends && now >= ends) return false;
  return true;
}

/** "live", "scheduled" (starts later), "ended" or "off" (switched off by hand). */
export function saleStatus(offer, now = Date.now()) {
  if (offer?.active === false) return "off";
  const starts = Number(offer?.startsAt) || 0;
  const ends = Number(offer?.endsAt) || 0;
  if (ends && now >= ends) return "ended";
  if (starts && now < starts) return "scheduled";
  return "live";
}

/** The next moment a sale in `offers` starts or ends after `now`, or 0 if none will. */
export function nextSaleChange(offers, now = Date.now()) {
  let next = 0;
  for (const offer of offers || []) {
    for (const t of [Number(offer?.startsAt) || 0, Number(offer?.endsAt) || 0]) {
      if (t > now && (!next || t < next)) next = t;
    }
  }
  return next;
}

const DAY = 86_400_000;

/** "5 Nov, 8:00 pm" in the shop's local time. */
export function saleDateLabel(ms) {
  if (!ms) return "";
  return new Date(ms)
    .toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })
    .replace(/\s?([ap])m/i, (_, x) => ` ${x.toLowerCase()}m`);
}

/** The short "ends" line shown on the banner itself. */
export function expiresInFor(endsAt, now = Date.now()) {
  if (!endsAt) return "Active today";
  if (endsAt - now < DAY) return "Ends today";
  return `Ends ${saleDateLabel(endsAt).split(",")[0]}`;
}

/** What the card in the console says about the schedule. */
export function scheduleLine(offer, now = Date.now()) {
  const status = saleStatus(offer, now);
  const starts = Number(offer?.startsAt) || 0;
  const ends = Number(offer?.endsAt) || 0;
  if (status === "off") return "Switched off. Customers don't see it.";
  if (status === "ended") return `Ended ${saleDateLabel(ends)}.`;
  if (status === "scheduled") return `Starts ${saleDateLabel(starts)}${ends ? `, ends ${saleDateLabel(ends)}` : ""}.`;
  return ends ? `Running now, ends ${saleDateLabel(ends)}.` : "Running now, with no end date.";
}

/** The value of an <input type="datetime-local"> for `ms` ("" for none). */
export function toLocalInput(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Epoch milliseconds from a datetime-local value, or 0 for none. */
export function fromLocalInput(value) {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export const BLANK_SALE = Object.freeze({
  id: "",
  title: "",
  subtitle: "",
  badge: "SALE",
  priceTag: "",
  appliesTo: "all",
  category: SALE_ALL,
  promoCode: "",
  img: "",
  startsAt: 0,
  endsAt: 0,
  active: true,
});

/** The editor's form for an existing sale (or a blank one). */
export function saleToForm(offer) {
  if (!offer) return { ...BLANK_SALE };
  const category = String(offer.category || SALE_ALL);
  return {
    id: offer.id || "",
    title: offer.title || "",
    subtitle: offer.subtitle || "",
    badge: offer.badge || "SALE",
    priceTag: offer.priceTag || "",
    appliesTo: offer.appliesTo === "category" || (offer.appliesTo === undefined && category !== SALE_ALL && category !== "Deals") ? "category" : "all",
    category,
    promoCode: offer.promoCode || "",
    img: offer.img || "",
    startsAt: Number(offer.startsAt) || 0,
    endsAt: Number(offer.endsAt) || 0,
    active: offer.active !== false,
  };
}

/** Problems with the form, in plain words; an empty list means it can be saved. */
export function saleProblems(form) {
  const problems = [];
  if (!String(form.title || "").trim()) problems.push("Give the sale a name.");
  if (form.appliesTo === "category" && (!form.category || form.category === SALE_ALL)) problems.push("Choose which category the sale is on.");
  if (form.startsAt && form.endsAt && form.endsAt <= form.startsAt) problems.push("The end has to be after the start.");
  if (form.endsAt && form.endsAt <= Date.now()) problems.push("The end is already in the past.");
  return problems;
}

/** The document to save for a valid form. */
export function formToSale(form, fallbackImg = "") {
  const category = form.appliesTo === "category" ? form.category : SALE_ALL;
  return {
    badge: String(form.badge || "SALE").trim().slice(0, 24).toUpperCase(),
    title: String(form.title).trim().slice(0, 80),
    subtitle: String(form.subtitle || "").trim().slice(0, 160),
    priceTag: String(form.priceTag || "").trim().slice(0, 40),
    appliesTo: form.appliesTo === "category" ? "category" : "all",
    category,
    promoCode: String(form.promoCode || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 24),
    img: form.img || fallbackImg,
    startsAt: Number(form.startsAt) || 0,
    endsAt: Number(form.endsAt) || 0,
    expiresIn: expiresInFor(Number(form.endsAt) || 0),
    gradient: "from-[#040E22] via-[#061838] to-[#0A2558]",
    accent: "text-amber-400",
    active: form.active !== false,
  };
}
