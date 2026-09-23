package com.dashit.app.core.design

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.HapticFeedbackConstants
import android.view.View

object HapticsManager {
    fun light(view: View? = null, context: Context? = null) {
        if (view != null) {
            view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
            return
        }
        vibrate(context, 10, 50)
    }

    fun selection(view: View? = null, context: Context? = null) {
        if (view != null) {
            view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
            return
        }
        vibrate(context, 15, 70)
    }

    fun medium(view: View? = null, context: Context? = null) {
        if (view != null) {
            view.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
            return
        }
        vibrate(context, 20, 90)
    }

    fun success(view: View? = null, context: Context? = null) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val vibrator = getVibrator(context)
            vibrator?.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK))
        } else {
            vibrate(context, 20, 100)
        }
    }

    fun warning(view: View? = null, context: Context? = null) {
        if (view != null) {
            view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
            return
        }
        vibrate(context, 35, 120)
    }

    fun error(view: View? = null, context: Context? = null) {
        if (view != null) {
            view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
            return
        }
        vibrate(context, 45, 160)
    }

    private fun vibrate(context: Context?, durationMs: Long, amplitude: Int) {
        val vibrator = getVibrator(context) ?: return
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val clampedAmp = amplitude.coerceIn(1, 255)
                vibrator.vibrate(VibrationEffect.createOneShot(durationMs, clampedAmp))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(durationMs)
            }
        } catch (_: Exception) {}
    }

    private fun getVibrator(context: Context?): Vibrator? {
        if (context == null) return null
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            manager?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
    }
}
