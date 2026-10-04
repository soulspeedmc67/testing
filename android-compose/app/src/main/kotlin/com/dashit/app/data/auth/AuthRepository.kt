package com.dashit.app.data.auth

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
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
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

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
    private const val SERVER = "https://dashit.co.in/api/auth/"

    private val auth: FirebaseAuth by lazy { FirebaseAuth.getInstance() }
    private val db: FirebaseFirestore by lazy { FirebaseFirestore.getInstance() }
    private var prefs: SharedPreferences? = null

    private val _user = MutableStateFlow<UserProfile?>(null)
    /** The signed-in shopper, or null. Its `mobile` is empty until they give one. */
    val user: StateFlow<UserProfile?> = _user.asStateFlow()

    val uid: String? get() = auth.currentUser?.uid

    /** A sign-in step failed; the message is ready to show. */
    class SignInException(
        message: String,
        val retryAfterSeconds: Int? = null,
        /** The server has no such endpoint (yet): a newer app than the site. */
        val notFound: Boolean = false
    ) : Exception(message)

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
    private fun Context.findActivity(): Activity? {
        var ctx = this
        while (ctx is ContextWrapper) {
            if (ctx is Activity) return ctx
            ctx = ctx.baseContext
        }
        return null
    }

    suspend fun signInWithGoogle(context: Context): UserProfile? {
        val activity = context.findActivity() ?: context
        val failed = "Google sign-in didn't complete. Please try again."
        val webClientId = activity.getString(R.string.default_web_client_id)
        val option = GetSignInWithGoogleOption.Builder(webClientId).build()
        val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
        val credential = try {
            CredentialManager.create(activity).getCredential(activity, request).credential
        } catch (e: GetCredentialCancellationException) {
            android.util.Log.d("DashitAuth", "User cancelled Google sign-in")
            return null
        } catch (e: GetCredentialException) {
            android.util.Log.e("DashitAuth", "CredentialManager getCredential failed: ${e.type} ${e.message}", e)
            throw SignInException(failed)
        } catch (e: Exception) {
            android.util.Log.e("DashitAuth", "CredentialManager unexpected error: ${e.message}", e)
            throw SignInException(failed)
        }
        if (credential !is CustomCredential || credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
            android.util.Log.e("DashitAuth", "Unexpected credential type: ${credential.type}")
            throw SignInException(failed)
        }
        val google = runCatching { GoogleIdTokenCredential.createFrom(credential.data) }
            .onFailure { android.util.Log.e("DashitAuth", "Failed to parse GoogleIdTokenCredential", it) }
            .getOrNull() ?: throw SignInException(failed)

        val user = try {
            auth.signInWithCredential(GoogleAuthProvider.getCredential(google.idToken, null)).await().user
        } catch (e: Exception) {
            android.util.Log.e("DashitAuth", "FirebaseAuth signInWithCredential failed: ${e.message}", e)
            throw SignInException(OFFLINE)
        } ?: throw SignInException(OFFLINE)

        val profile = try {
            ensureUserProfile(
                uid = user.uid,
                name = google.displayName?.trim()?.takeIf { it.isNotEmpty() },
                email = user.email ?: google.id
            )
        } catch (e: Exception) {
            android.util.Log.e("DashitAuth", "ensureUserProfile failed: ${e.message}", e)
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

    /**
     * What asking for a code did: [configured] is false while the server has no
     * 2Factor key yet, in which case nothing was sent and the number is simply
     * saved (see [saveMobile]); otherwise a code was texted and [ticket] goes
     * back with it to [verifyOtp].
     */
    data class OtpRequest(val configured: Boolean, val ticket: String?, val resendAfterSeconds: Int)

    /** Texts a code to the number through the server (2Factor). */
    suspend fun requestOtp(rawMobile: String): OtpRequest {
        val mobile = normalizedMobile(rawMobile) ?: throw SignInException("Enter a valid 10-digit mobile number.")
        val reply = try {
            post("send-otp.php", JSONObject().put("mobile", mobile).put("id_token", idToken()))
        } catch (e: SignInException) {
            // A site that hasn't been updated yet has no code endpoint: just save the number.
            if (e.notFound) return OtpRequest(false, null, 0)
            throw e
        }
        if (!reply.optBoolean("configured", false)) return OtpRequest(false, null, 0)
        return OtpRequest(true, reply.optString("ticket").takeIf { it.isNotBlank() }, reply.optInt("resend_after", 30))
    }

    /** Checks the code; the server marks the number verified on the profile. */
    suspend fun verifyOtp(rawMobile: String, code: String, ticket: String): UserProfile {
        val mobile = normalizedMobile(rawMobile) ?: throw SignInException("Enter a valid 10-digit mobile number.")
        val current = _user.value ?: throw IllegalStateException("Please sign in first.")
        post(
            "verify-otp.php",
            JSONObject().put("mobile", mobile).put("otp", code).put("ticket", ticket).put("id_token", idToken())
        )
        val updated = current.copy(mobile = mobile)
        save(updated)
        return updated
    }

    /** The signed-in shopper's Firebase ID token: what the server checks to know who is asking. */
    suspend fun idToken(): String =
        runCatching { auth.currentUser?.getIdToken(false)?.await()?.token }.getOrNull()
            ?: throw SignInException("Please sign in again.")

    /** Saves the number the delivery person can call (not verified by a code), or changes it. */
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

    /** POSTs JSON to the sign-in server; its `error` message becomes the SignInException's. */
    private suspend fun post(path: String, body: JSONObject): JSONObject = withContext(Dispatchers.IO) {
        val connection = try {
            (URL(SERVER + path).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 10_000
                readTimeout = 25_000
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                outputStream.use { it.write(body.toString().toByteArray()) }
            }
        } catch (e: Exception) {
            throw SignInException(OFFLINE)
        }
        try {
            val status = connection.responseCode
            val text = (if (status in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader()?.use { it.readText() }.orEmpty()
            val json = runCatching { JSONObject(text) }.getOrNull()
            if (status !in 200..299 || json == null) {
                throw SignInException(
                    json?.optString("error")?.takeIf { it.isNotBlank() } ?: "That didn't work. Please try again.",
                    retryAfterSeconds = json?.optInt("retry_after")?.takeIf { it > 0 },
                    notFound = status == 404
                )
            }
            json
        } catch (e: SignInException) {
            throw e
        } catch (e: Exception) {
            throw SignInException(OFFLINE)
        } finally {
            connection.disconnect()
        }
    }
}
