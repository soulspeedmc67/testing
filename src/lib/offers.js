export const DEFAULT_OFFERS = [
  {
    id: "offer-snacks-01",
    badge: "DASHIT EXCLUSIVE",
    title: "Gourmet Snacks & Chilled Sips",
    subtitle: "Artisanal crisps, premium chocolates & chilled sodas with fastest delivery.",
    priceTag: "Starting ₹20",
    category: "Snacks",
    promoCode: "CRISP20",
    discountPercent: 20,
    expiresIn: "Ends in 3 hours",
    img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80",
    gradient: "from-[#040E22] via-[#061838] to-[#0A2558]",
    accent: "text-amber-400",
    active: true,
    createdAt: Date.now() - 3600000
  },
  {
    id: "offer-bakery-02",
    badge: "FRESH FROM OVEN",
    title: "Artisan Breads & Morning Bakes",
    subtitle: "Authentic Kashmiri lavas, soft croissants & golden rolls delivered warm.",
    priceTag: "Starting ₹30",
    category: "Bakery",
    promoCode: "BAKE15",
    discountPercent: 15,
    expiresIn: "Ends at 12:00 PM",
    img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=600&auto=format&fit=crop&q=80",
    gradient: "from-[#140C04] via-[#241406] to-[#361E0A]",
    accent: "text-[#FF8A3D]",
    active: true,
    createdAt: Date.now() - 7200000
  },
  {
    id: "offer-dairy-03",
    badge: "FARM TO DOORSTEP",
    title: "Fresh Milk, Butter & Kashmiri Apples",
    subtitle: "Chilled Amul dairy, creamy butter & crisp valley apples in minutes.",
    priceTag: "Save up to 25%",
    category: "Dairy",
    promoCode: "FRESH25",
    discountPercent: 25,
    expiresIn: "Active Today",
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80",
    gradient: "from-[#041424] via-[#08223C] to-[#0C3256]",
    accent: "text-sky-300",
    active: true,
    createdAt: Date.now() - 10800000
  }
];

export function getExclusiveOffers() {
  if (typeof window === "undefined") return DEFAULT_OFFERS;
  try {
    const raw = localStorage.getItem("dashit_exclusive_offers");
    if (!raw) {
      localStorage.setItem("dashit_exclusive_offers", JSON.stringify(DEFAULT_OFFERS));
      return DEFAULT_OFFERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_OFFERS;
  } catch (e) {
    return DEFAULT_OFFERS;
  }
}

export function saveExclusiveOffers(offers) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("dashit_exclusive_offers", JSON.stringify(offers));
    window.dispatchEvent(new Event("dashit_offers_updated"));
  } catch (e) {}
}

export function addExclusiveOffer(newOffer) {
  const current = getExclusiveOffers();
  const offerWithId = {
    ...newOffer,
    id: newOffer.id || `offer-${Date.now()}`,
    active: newOffer.active !== false,
    createdAt: Date.now()
  };
  const updated = [offerWithId, ...current];
  saveExclusiveOffers(updated);
  return updated;
}

export function toggleOfferActive(offerId) {
  const current = getExclusiveOffers();
  const updated = current.map((o) =>
    o.id === offerId ? { ...o, active: !o.active } : o
  );
  saveExclusiveOffers(updated);
  return updated;
}

export function deleteExclusiveOffer(offerId) {
  const current = getExclusiveOffers();
  const updated = current.filter((o) => o.id !== offerId);
  saveExclusiveOffers(updated);
  return updated;
}
