package com.dashit.app.data.auth

import android.content.Context
import android.content.SharedPreferences
import com.dashit.app.BuildConfig
import com.dashit.app.data.model.UserProfile
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Sign-in for the customer app, sharing Firebase Auth and `users/{uid}` with
 * the iOS app. Shoppers sign in with their phone number only: the sign-in
 * server next to the website (dashit.co.in/api/auth/, PHP on Hostinger) sends
 * a 6-digit code to the number on WhatsApp and swaps the right code for a
 * Firebase custom token. One number is one account ("ph-91XXXXXXXXXX") on any
 * phone, and the token carries the number, which the Firestore rules check.
 * Orders are written under that uid. Same flow as iOS (`AuthService.swift`).
 */
object AuthRepository {
    private const val SERVER = BuildConfig.SIGN_IN_SERVER
    private const val OFFLINE = "Couldn't reach DASHit. Check your connection and try again."

    private val auth: FirebaseAuth by lazy { FirebaseAuth.getInstance() }
    private val db: FirebaseFirestore by lazy { FirebaseFirestore.getInstance() }
    private var prefs: SharedPreferences? = null

    private val _user = MutableStateFlow<UserProfile?>(null)
    /** The signed-in shopper, or null. */
    val user: StateFlow<UserProfile?> = _user.asStateFlow()

    val uid: String? get() = auth.currentUser?.uid

    /** A sign-in step failed; the message is ready to show. */
    class SignInException(message: String, val retryAfterSeconds: Int? = null) : Exception(message)

    fun init(context: Context) {
        if (prefs != null) return
        prefs = context.applicationContext.getSharedPreferences("dashit_auth", Context.MODE_PRIVATE)
        val current = auth.currentUser ?: return
        // Sessions from before sign-in codes (the number was only confirmed on
        // screen) don't count: those shoppers sign in again with a code.
        if (!current.uid.startsWith("ph-")) {
            signOut()
            return
        }
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

    /** Sends a 6-digit code to the number on WhatsApp. Returns the seconds before another can be sent. */
    suspend fun sendCode(rawMobile: String): Int {
        val mobile = normalizedMobile(rawMobile) ?: throw SignInException("Enter a valid 10-digit mobile number.")
        return post("send-code.php", JSONObject().put("mobile", mobile)).optInt("resend_after", 30)
    }

    /**
     * Checks the code and signs in to the number's account. `name`, from the
     * sign-up form, fills an account that has none yet. Also confirms it's
     * really the shopper before their account is deleted: Firebase only
     * deletes an account shortly after it signed in.
     */
    suspend fun signIn(rawMobile: String, code: String, name: String? = null): UserProfile {
        val mobile = normalizedMobile(rawMobile) ?: throw SignInException("Enter a valid 10-digit mobile number.")
        val token = post("verify-code.php", JSONObject().put("mobile", mobile).put("code", code)).optString("token")
        try {
            require(token.isNotBlank())
            val uid = auth.signInWithCustomToken(token).await().user?.uid
                ?: throw IllegalStateException("Sign-in failed")
            val profile = ensureUserProfile(uid, mobile, name?.trim()?.takeIf { it.isNotEmpty() })
            save(profile)
            return profile
        } catch (e: Exception) {
            throw SignInException("We couldn't sign you in. Check your connection and try again.")
        }
    }

    fun signOut() {
        auth.signOut()
        prefs?.edit()?.clear()?.apply()
        _user.value = null
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
     * sales records, as on iOS. Call it straight after [signIn] with a fresh
     * code, since Firebase refuses to delete an account signed in long ago.
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

    /** 10 digits starting 6–9, the same rule as the iOS app and the sign-in server. */
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
                    json?.optString("error")?.takeIf { it.isNotBlank() }
                        ?: "Signing in isn't working right now. Please try again.",
                    retryAfterSeconds = json?.optInt("retry_after")?.takeIf { it > 0 }
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
