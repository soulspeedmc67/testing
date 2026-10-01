package com.dashit.app.core.design

import android.content.Context
import android.view.View

/**
 * Kept so screens can say where a tap would be felt, but the Android app
 * doesn't vibrate at all: Android motors buzz harshly where the iPhone's
 * taptic engine gives a crisp tick (project rule: haptics are iOS only).
 */
@Suppress("UNUSED_PARAMETER")
object HapticsManager {
    fun light(view: View? = null, context: Context? = null) = Unit
    fun selection(view: View? = null, context: Context? = null) = Unit
    fun medium(view: View? = null, context: Context? = null) = Unit
    fun success(view: View? = null, context: Context? = null) = Unit
    fun warning(view: View? = null, context: Context? = null) = Unit
    fun error(view: View? = null, context: Context? = null) = Unit
}
