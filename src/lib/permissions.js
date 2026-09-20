/**
 * Runtime Permission & Compliance Validation
 *
 * Implements Google Play and Apple compliant dynamic permission validation
 * and rationale prompts before requesting sensitive device capabilities.
 */

/**
 * Explains why a sensitive permission is requested before the system prompt.
 *
 * @param {string} permissionType - 'location' | 'camera' | 'notifications'
 * @returns {object} Permission explanation object
 */
export function explainPermission(permissionType) {
  const rationales = {
    location: {
      title: "Location Access",
      message:
        "DASHit needs your delivery location to accurately pinpoint your doorstep and verify 10-minute delivery coverage across Anantnag.",
    },
    camera: {
      title: "Camera Access",
      message:
        "DASHit uses the camera solely for warehouse stock barcode scanning and package verification.",
    },
    notifications: {
      title: "Order Alerts",
      message:
        "DASHit sends real-time order updates so you know when your delivery partner is arriving.",
    },
  };

  return (
    rationales[permissionType] || {
      title: "Permission Request",
      message: "This feature requires device permission to operate.",
    }
  );
}

/**
 * showPermissionRationale displays a clear rationale dialog to the customer
 * before triggering native runtime permission requests.
 */
export async function showPermissionRationale(permissionType) {
  const { title, message } = explainPermission(permissionType);
  if (typeof window !== "undefined" && typeof window.confirm === "function") {
    // Basic fallback prompt; can be swapped with custom UI modal
    return window.confirm(`${title}\n\n${message}\n\nDo you wish to proceed?`);
  }
  return true;
}
