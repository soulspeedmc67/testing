package com.dashit.app.data.auth

import android.content.Context
import android.content.SharedPreferences
import com.dashit.app.data.model.UserProfile
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.tasks.await

/**
 * Sign-in for the customer app, sharing Firebase Auth and `users/{uid}` with
 * the web and iOS apps. The shopper confirms their number on screen and gets an
 * anonymous Firebase session (the Spark plan has no SMS), exactly as the web and
 * iOS do. Orders are written under that uid, which the Firestore rules require.
 */
object AuthRepository {
    private val auth: FirebaseAuth by lazy { FirebaseAuth.getInstance() }
    private val db: FirebaseFirestore by lazy { FirebaseFirestore.getInstance() }
    private var prefs: SharedPreferences? = null

    private val _user = MutableStateFlow<UserProfile?>(null)
    /** The signed-in shopper, or null. */
    val user: StateFlow<UserProfile?> = _user.asStateFlow()

    val uid: String? get() = auth.currentUser?.uid

    fun init(context: Context) {
        if (prefs != null) return
        prefs = context.applicationContext.getSharedPreferences("dashit_auth", Context.MODE_PRIVATE)
        val current = auth.currentUser ?: return
        val stored = prefs?.getString("uid", null)
        val mobile = prefs?.getString("mobile", null)
        if (stored == current.uid && !mobile.isNullOrEmpty()) {
            _user.value = UserProfile(
                id = current.uid,
                mobile = mobile,
                name = prefs?.getString("name", null),
                email = prefs?.getString("email", null)
            )
        }
    }

    /** Signs in with a number the shopper has confirmed on screen. */
    suspend fun signInWithConfirmedMobile(rawMobile: String, name: String? = null): UserProfile {
        val mobile = normalizedMobile(rawMobile)
            ?: throw IllegalArgumentException("Enter a valid 10-digit mobile number.")
        try {
            val uid = auth.currentUser?.uid ?: auth.signInAnonymously().await().user?.uid
                ?: throw IllegalStateException("Sign-in failed")
            val profile = ensureUserProfile(uid, mobile, name?.trim()?.takeIf { it.isNotEmpty() })
            save(profile)
            return profile
        } catch (e: IllegalArgumentException) {
            throw e
        } catch (e: Exception) {
            throw IllegalStateException("We couldn't sign you in. Check your connection and try again.", e)
        }
    }

    fun signOut() {
        auth.signOut()
        prefs?.edit()?.clear()?.apply()
        _user.value = null
    }

    /**
     * Google Play account deletion: removes the profile and saved addresses,
     * then the Firebase account itself. Orders stay with the store as its
     * sales records, as on the web and iOS.
     */
    suspend fun deleteAccount() {
        val current = auth.currentUser ?: return
        val profile = db.collection("users").document(current.uid)
        runCatching {
            profile.collection("addresses").get().await().documents.forEach { it.reference.delete().await() }
        }
        profile.delete().await()
        current.delete().await()
        prefs?.edit()?.clear()?.apply()
        _user.value = null
    }

    /** 10 digits starting 6–9, the same rule as the web and iOS apps. */
    fun normalizedMobile(input: String): String? {
        val digits = input.filter { it.isDigit() }.takeLast(10)
        if (digits.length != 10 || digits.first() !in "6789") return null
        return digits
    }

    private suspend fun ensureUserProfile(uid: String, mobile: String, name: String?): UserProfile {
        val ref = db.collection("users").document(uid)
        val snapshot = ref.get().await()
        if (snapshot.exists()) {
            val patch = hashMapOf<String, Any>("lastLoginAt" to FieldValue.serverTimestamp())
            if (snapshot.getString("mobile") != mobile) patch["mobile"] = mobile
            val existingName = snapshot.getString("name")
            if (existingName.isNullOrEmpty() && name != null) patch["name"] = name
            ref.set(patch, SetOptions.merge()).await()
            return UserProfile(
                id = uid,
                mobile = mobile,
                name = existingName?.takeIf { it.isNotEmpty() } ?: name,
                email = snapshot.getString("email")
            )
        }
        val fields = hashMapOf<String, Any>(
            "uid" to uid,
            "mobile" to mobile,
            "createdAt" to FieldValue.serverTimestamp(),
            "lastLoginAt" to FieldValue.serverTimestamp()
        )
        if (name != null) fields["name"] = name
        ref.set(fields, SetOptions.merge()).await()
        return UserProfile(id = uid, mobile = mobile, name = name, email = null)
    }

    private fun save(profile: UserProfile) {
        prefs?.edit()
            ?.putString("uid", profile.id)
            ?.putString("mobile", profile.mobile)
            ?.putString("name", profile.name)
            ?.putString("email", profile.email)
            ?.apply()
        _user.value = profile
    }
}
