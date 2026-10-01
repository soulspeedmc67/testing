package com.dashit.app.data.auth

import android.content.Context
import android.content.SharedPreferences
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import com.dashit.app.R
import com.dashit.app.data.model.UserProfile
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.tasks.await
import java.util.UUID

/**
 * Sign-in for the customer app, sharing Firebase Auth and `users/{uid}` with
 * the iOS app. The shopper's Google account (Apple on iPhone) is the account:
 * Firebase gives it a uid, and the profile, saved addresses and every order
 * are kept under that uid, so signing in on a new phone brings them back.
 *
 * After signing in the shopper gives their mobile number once, so the
 * delivery person can call them. The number is only collected, not verified
 * (no code is sent), and can be changed any time. Each phone also registers a
 * random install id on the profile (`devices`), never a hardware identifier.
 * Same flow as iOS (`AuthService.swift`).
 *
 * Accounts made by the older number sign-in ("ph-91XXXXXXXXXX") keep working.
 */
object AuthRepository {
    private const val OFFLINE = "Couldn't reach DASHit. Check your connection and try again."

    private val auth: FirebaseAuth by lazy { FirebaseAuth.getInstance() }
    private val db: FirebaseFirestore by lazy { FirebaseFirestore.getInstance() }
    private var prefs: SharedPreferences? = null

    private val _user = MutableStateFlow<UserProfile?>(null)
    /** The signed-in shopper, or null. Its `mobile` is empty until they give one. */
    val user: StateFlow<UserProfile?> = _user.asStateFlow()

    val uid: String? get() = auth.currentUser?.uid

    /** A sign-in step failed; the message is ready to show. */
    class SignInException(message: String, val retryAfterSeconds: Int? = null) : Exception(message)

    fun init(context: Context) {
        if (prefs != null) return
        prefs = context.applicationContext.getSharedPreferences("dashit_auth", Context.MODE_PRIVATE)
        val current = auth.currentUser ?: return
        // Sessions from before sign-in codes (the number was only confirmed on
        // screen, an anonymous Firebase user) don't count: sign in again.
        if (current.isAnonymous) {
            signOut()
            return
        }
        if (prefs?.getString("uid", null) == current.uid) {
            _user.value = UserProfile(
                id = current.uid,
                mobile = prefs?.getString("mobile", null).orEmpty(),
                name = prefs?.getString("name", null),
                email = prefs?.getString("email", null)
            )
        }
    }

    /**
     * Signs in with Google (the "Sign in with Google" sheet; [activity] shows
     * it) and returns the account's profile, which has no number yet the first
     * time. Null if the sheet was closed.
     */
    suspend fun signInWithGoogle(activity: Context): UserProfile? {
        val failed = "Google sign-in didn't complete. Please try again."
        val option = GetSignInWithGoogleOption.Builder(activity.getString(R.string.default_web_client_id)).build()
        val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
        val credential = try {
            CredentialManager.create(activity).getCredential(activity, request).credential
        } catch (e: GetCredentialCancellationException) {
            return null
        } catch (e: GetCredentialException) {
            throw SignInException(failed)
        }
        if (credential !is CustomCredential || credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
            throw SignInException(failed)
        }
        val google = runCatching { GoogleIdTokenCredential.createFrom(credential.data) }.getOrNull()
            ?: throw SignInException(failed)
        val user = runCatching {
            auth.signInWithCredential(GoogleAuthProvider.getCredential(google.idToken, null)).await().user
        }.getOrNull() ?: throw SignInException(OFFLINE)
        val profile = try {
            ensureUserProfile(
                uid = user.uid,
                name = google.displayName?.trim()?.takeIf { it.isNotEmpty() },
                email = user.email ?: google.id
            )
        } catch (e: Exception) {
            throw SignInException("We couldn't sign you in. Check your connection and try again.")
        }
        save(profile)
        return profile
    }

    fun signOut() {
        auth.signOut()
        prefs?.edit()?.clear()?.apply()
        _user.value = null
    }

    /** Saves the number the delivery person can call (not verified), or changes it. */
    suspend fun saveMobile(rawMobile: String): UserProfile {
        val mobile = normalizedMobile(rawMobile) ?: throw SignInException("Enter a valid 10-digit mobile number.")
        val current = _user.value ?: throw IllegalStateException("Please sign in first.")
        try {
            db.collection("users").document(current.id)
                .set(mapOf("mobile" to mobile, "mobileVerified" to false, "updatedAt" to FieldValue.serverTimestamp()), SetOptions.merge())
                .await()
        } catch (e: Exception) {
            throw SignInException("We couldn't save your number. Check your connection and try again.")
        }
        val updated = current.copy(mobile = mobile)
        save(updated)
        return updated
    }

    /** Adds the shopper's name to an account that has none. */
    suspend fun updateName(rawName: String): UserProfile {
        val name = rawName.trim()
        require(name.isNotEmpty()) { "Please enter your name." }
        val current = _user.value ?: throw IllegalStateException("Please sign in first.")
        try {
            db.collection("users").document(current.id)
                .set(mapOf("name" to name, "updatedAt" to FieldValue.serverTimestamp()), SetOptions.merge())
                .await()
        } catch (e: Exception) {
            throw IllegalStateException("We couldn't save your name. Check your connection and try again.", e)
        }
        val updated = current.copy(name = name)
        save(updated)
        return updated
    }

    /**
     * Google Play account deletion: removes the profile and saved addresses,
     * then the Firebase account itself. Orders stay with the store as its
     * sales records, as on iOS. Call it straight after [signInWithGoogle],
     * since Firebase refuses to delete an account signed in long ago.
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
        com.dashit.app.data.RecentSearches.clear()
        _user.value = null
    }

    /** 10 digits starting 6–9, the same rule as the iOS app. */
    fun normalizedMobile(input: String): String? {
        val digits = input.filter { it.isDigit() }.takeLast(10)
        if (digits.length != 10 || digits.first() !in "6789") return null
        return digits
    }

    /** A random id for this install, kept on the phone; links the phone to the account without any hardware id. */
    private fun installId(): String {
        val saved = prefs?.getString("install_id", null)
        if (saved != null) return saved
        return UUID.randomUUID().toString().also { prefs?.edit()?.putString("install_id", it)?.apply() }
    }

    private suspend fun ensureUserProfile(uid: String, name: String?, email: String?): UserProfile {
        val ref = db.collection("users").document(uid)
        val snapshot = ref.get().await()
        val device = installId()
        val patch = hashMapOf<String, Any>(
            "uid" to uid,
            "provider" to "google",
            "lastLoginAt" to FieldValue.serverTimestamp(),
            // This phone, kept as a map of install ids so one account can be on several phones.
            "devices" to mapOf(device to mapOf("platform" to "android", "lastSeenAt" to FieldValue.serverTimestamp()))
        )
        if (!snapshot.exists()) patch["createdAt"] = FieldValue.serverTimestamp()
        val existingName = snapshot.getString("name")?.takeIf { it.isNotEmpty() }
        if (existingName == null && name != null) patch["name"] = name
        if (snapshot.getString("email").isNullOrEmpty() && email != null) patch["email"] = email
        ref.set(patch, SetOptions.merge()).await()
        return UserProfile(
            id = uid,
            mobile = snapshot.getString("mobile").orEmpty(),
            name = existingName ?: name,
            email = snapshot.getString("email")?.takeIf { it.isNotEmpty() } ?: email
        )
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
