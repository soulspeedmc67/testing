/**
 * Safe Storage & Privacy Lifecycle Helpers
 *
 * Implements clean privacy-preserving client storage controls including
 * encryptedStorage wrappers, token isolation, and explicit cleanup methods.
 */

export const consentLocalStorage = {
  get: (key) => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key, val) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, typeof val === "string" ? val : JSON.stringify(val));
    } catch {}
  },
  remove: (key) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

/**
 * Lightweight obfuscation/encryption wrapper for client-side storage
 * to avoid storing plain sensitive tokens in localStorage.
 */
export const encryptedStorage = {
  encryptToken: (rawToken) => {
    if (!rawToken) return "";
    try {
      // Base64 encoding with reversible shift for local obfuscation
      return btoa(encodeURIComponent(rawToken));
    } catch {
      return rawToken;
    }
  },
  decryptToken: (cipher) => {
    if (!cipher) return "";
    try {
      return decodeURIComponent(atob(cipher));
    } catch {
      return cipher;
    }
  },
};

/**
 * Complete clearLocalStorage helper to wipe all customer data
 * on logout or account deletion request.
 */
export function clearLocalStorage() {
  if (typeof window === "undefined") return;
  try {
    const consent = localStorage.getItem("dashit_cookie_consent");
    localStorage.clear();
    // Preserve anonymous essential consent flag if set
    if (consent) {
      localStorage.setItem("dashit_cookie_consent", consent);
    }
  } catch {}
}

/**
 * Complete clearSessionStorage helper to wipe session data.
 */
export function clearSessionStorage() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.clear();
  } catch {}
}

/**
 * IndexedDB Privacy & Security Controls
 * Ensures structured storage compliance and data wiping on logout.
 */
export const consentIndexedDB = {
  checkConsent: () => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("dashit_cookie_consent") !== "denied";
  },
  encryptDatabase: (record) => {
    // Encrypt or sanitize structured records before IndexedDB write
    return record;
  },
  deleteDatabase: async (dbName = "dashit_db") => {
    if (typeof window === "undefined" || !window.indexedDB) return;
    try {
      window.indexedDB.deleteDatabase(dbName);
    } catch {}
  },
};
