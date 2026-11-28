package com.dashit.app.data

import android.content.Context
import android.content.SharedPreferences
import com.dashit.app.data.auth.AuthRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * "Notify me" on items that are out of stock, the same as the website
 * (src/lib/restock.js) and the iPhone app. The request goes to
 * public/api/restock/request.php; the shop owner sees it under "Restock
 * requests" in the admin apps and can tell everyone who asked once it's back
 * (a "Back in stock" push). Which items this phone asked about is kept here,
 * so the button keeps saying so.
 */
object RestockRequests {
    private const val URL_REQUEST = "https://dashit.co.in/api/restock/request.php"
    private const val KEY = "asked"
    private var prefs: SharedPreferences? = null
    private val _asked = MutableStateFlow<Set<String>>(emptySet())
    val asked: StateFlow<Set<String>> = _asked.asStateFlow()

    fun init(context: Context) {
        prefs = context.applicationContext.getSharedPreferences("dashit_restock", Context.MODE_PRIVATE)
        _asked.value = prefs?.getStringSet(KEY, emptySet())?.toSet() ?: emptySet()
    }

    class NeedsSignIn : Exception("Sign in to get told when it's back.")

    /** Asks to be told when [productId] is back, or takes that back. Returns the new state. */
    suspend fun toggle(productId: String): Boolean {
        if (AuthRepository.user.value == null) throw NeedsSignIn()
        val wanted = productId !in _asked.value
        val token = runCatching { AuthRepository.idToken() }.getOrElse { throw NeedsSignIn() }
        withContext(Dispatchers.IO) {
            val connection = (URL(URL_REQUEST).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 10_000
                readTimeout = 20_000
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
            }
            try {
                val body = JSONObject()
                    .put("id_token", token)
                    .put("productId", productId)
                    .put("action", if (wanted) "add" else "remove")
                connection.outputStream.use { it.write(body.toString().toByteArray()) }
                val status = connection.responseCode
                if (status == 401) throw NeedsSignIn()
                if (status !in 200..299) {
                    val reply = runCatching { connection.errorStream?.bufferedReader()?.readText() }.getOrNull()
                    val message = runCatching { JSONObject(reply ?: "").optString("error") }.getOrNull()
                    throw IllegalStateException(message?.takeIf { it.isNotBlank() } ?: "Couldn't save that. Please try again.")
                }
            } finally {
                connection.disconnect()
            }
        }
        val next = if (wanted) _asked.value + productId else _asked.value - productId
        _asked.value = next
        prefs?.edit()?.putStringSet(KEY, next)?.apply()
        return wanted
    }
}
