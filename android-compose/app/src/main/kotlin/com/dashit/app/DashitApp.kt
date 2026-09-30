package com.dashit.app

import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.appcheck.FirebaseAppCheck

/**
 * Turns on Firebase App Check before anything touches Firestore or sign-in.
 *
 * Every request then carries a token showing it came from this app on a real
 * phone (Play Integrity), not from a script holding the public Firebase
 * config. While App Check is set to "monitor" in the Firebase console nothing
 * is refused; once it is enforced, requests without a token are, which is
 * what stops a stranger running up the Firestore bill.
 *
 * Debug builds use the debug provider instead: they print a debug token to
 * logcat ("DebugAppCheckProvider") that is added in the Firebase console.
 */
class DashitApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Without google-services.json there's no Firebase and the app runs on
        // its built-in catalogue; nothing to protect then.
        if (FirebaseApp.getApps(this).isEmpty()) return
        FirebaseAppCheck.getInstance().installAppCheckProviderFactory(AppCheckProvider.factory)
    }
}
