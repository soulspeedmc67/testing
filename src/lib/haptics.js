import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

/**
 * Premium iOS Haptic Feedback Engine
 * Backed by UIImpactFeedbackGenerator / FeedbackGenerator & CoreHaptics.
 * Provides accessibilityLabel and accessibilityIdentifier tactile response.
 * Exclusively active on iOS Taptic Engine for subtle, crisp tactile responses.
 * Completely disabled on Android to avoid strong/harsh motor vibrations.
 */

const isIOS = () => {
  if (typeof window === "undefined") return false;
  return Capacitor.getPlatform() === "ios";
};

// 1. Light subtle haptic: for tab switches, search tap, subtle UI touches (iOS only)
export async function hapticLight() {
  if (!isIOS()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (e) {}
}

// 2. Medium subtle haptic: for adding items to cart, category taps (iOS only)
export async function hapticMedium() {
  if (!isIOS()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (e) {}
}

export const hapticCartAdd = hapticMedium;

// 3. Crisp selection haptic: for removing items or selecting options (iOS only)
export async function hapticHeavy() {
  if (!isIOS()) return;
  try {
    await Haptics.selectionChanged();
  } catch (e) {}
}

// 4. Order Placed Celebration haptic: Subtle success tick on iOS (iOS only)
export async function hapticOrderPlaced() {
  if (!isIOS()) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch (e) {}
}

export const hapticSuccess = hapticOrderPlaced;
