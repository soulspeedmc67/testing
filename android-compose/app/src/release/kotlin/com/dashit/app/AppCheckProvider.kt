package com.dashit.app

import com.google.firebase.appcheck.AppCheckProviderFactory
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory

/** Release builds: Google Play Integrity vouches for the app and the phone. */
object AppCheckProvider {
    val factory: AppCheckProviderFactory get() = PlayIntegrityAppCheckProviderFactory.getInstance()
}
