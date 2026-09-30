package com.dashit.app

import com.google.firebase.appcheck.AppCheckProviderFactory
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory

/** Debug builds: a debug token, printed to logcat, stands in for Play Integrity. */
object AppCheckProvider {
    val factory: AppCheckProviderFactory get() = DebugAppCheckProviderFactory.getInstance()
}
