package com.dashit.app.core.design

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * Light, Dark or Automatic (follows the phone), as on the iPhone app's
 * Appearance setting. Kept on the phone; [DashitTheme] reads it.
 */
object ThemePreference {
    enum class Mode(val key: String, val label: String) {
        SYSTEM("system", "Automatic"),
        LIGHT("light", "Light"),
        DARK("dark", "Dark")
    }

    private const val PREFS = "dashit_prefs"
    private const val KEY = "dashit_theme"

    var mode by mutableStateOf(Mode.SYSTEM)
        private set

    private var appContext: Context? = null

    fun init(context: Context) {
        appContext = context.applicationContext
        val saved = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)
        mode = Mode.entries.firstOrNull { it.key == saved } ?: Mode.SYSTEM
    }

    fun set(newMode: Mode) {
        mode = newMode
        appContext?.getSharedPreferences(PREFS, Context.MODE_PRIVATE)?.edit()?.putString(KEY, newMode.key)?.apply()
    }
}
