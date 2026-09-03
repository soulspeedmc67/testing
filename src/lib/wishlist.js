import { hapticMedium, hapticLight } from "./haptics";

const WISHLIST_KEY = "dashit_wishlist";

export function getWishlist() {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(WISHLIST_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function isItemInWishlist(productId) {
  if (!productId) return false;
  const list = getWishlist();
  const idStr = String(productId);
  return list.some((item) => String(item.id || item.barcode) === idStr);
}

export function addToWishlist(product) {
  if (!product) return;
  const list = getWishlist();
  const pId = String(product.id || product.barcode);
  if (!list.some((item) => String(item.id || item.barcode) === pId)) {
    const updated = [product, ...list];
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("dashit_wishlist_updated"));
      hapticMedium();
    } catch (e) {}
  }
}

export function removeFromWishlist(productId) {
  if (!productId) return;
  const list = getWishlist();
  const idStr = String(productId);
  const updated = list.filter((item) => String(item.id || item.barcode) !== idStr);
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("dashit_wishlist_updated"));
    hapticLight();
  } catch (e) {}
}

export function toggleWishlistItem(product) {
  if (!product) return false;
  const pId = String(product.id || product.barcode);
  if (isItemInWishlist(pId)) {
    removeFromWishlist(pId);
    return false;
  } else {
    addToWishlist(product);
    return true;
  }
}
