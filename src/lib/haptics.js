import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

/**
 * Premium iOS & Android Haptic Feedback Engine
 * Scaled intensity based on the user interaction.
 */

// 1. Light haptic: for tab switches, search tap, subtle UI touches
export async function hapticLight() {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (e) {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(8);
    }
  }
}

// 2. Medium haptic: for adding items to cart, category taps
export async function hapticMedium() {
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (e) {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(20);
    }
  }
}

// 3. Heavy haptic: for removing items from cart, confirming address, modal actions
export async function hapticHeavy() {
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (e) {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(40);
    }
  }
}

// 4. Order Placed Celebration haptic: Highest intensity, rich pleasant sequence
export async function hapticOrderPlaced() {
  try {
    await Haptics.notification({ type: NotificationType.Success });
    // Follow-up micro celebration tap
    setTimeout(async () => {
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch (err) {}
    }, 120);
  } catch (e) {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([40, 50, 80]);
    }
  }
}
