package com.dashit.app.data.repository

import android.content.Context
import android.util.Log
import com.dashit.app.BuildConfig
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * The shop's product list, from one file on the website instead of ~4,600
 * Firestore reads (public/api/catalog/). A copy is kept on the phone: shown at
 * once on the next open, refreshed from the file when it has changed (the
 * server answers "not modified" otherwise), and kept current by asking the
 * website what changed since its version.
 *
 * Entries keep Firestore's field names, so they're read like before; a
 * switched-off product arrives as { id, active: false } and is dropped.
 */
class CatalogueFile(context: Context) {
    private val saved = File(context.filesDir, "catalog.json")
    private val prefs = context.getSharedPreferences("dashit_catalog", Context.MODE_PRIVATE)
    private val entries = LinkedHashMap<String, JSONObject>()

    /** The newest change this phone has (ms); 0 before the first copy. */
    var version: Long = 0
        private set

    /** Products shown, by id. */
    fun shown(): Map<String, JSONObject> = entries.filterValues { it.optBoolean("active", true) }

    /** The copy saved on the phone. False if there is none (or it can't be read). */
    fun loadSaved(): Boolean = runCatching {
        if (!saved.exists()) return false
        val data = JSONObject(saved.readText())
        replaceAll(data)
        true
    }.getOrElse {
        Log.w(TAG, "Saved catalogue unreadable", it)
        false
    }

    /**
     * Fetches the file if it changed since the copy here. True when the copy
     * was replaced; false when it was already current or the file couldn't be
     * had (the copy here stays).
     */
    fun download(): Boolean {
        val connection = (URL(BuildConfig.CATALOG_SERVER + "catalog/catalog.json").openConnection() as HttpURLConnection).apply {
            connectTimeout = 10_000
            readTimeout = 30_000
            setRequestProperty("Accept", "application/json")
            // Both, so "not modified" works even when the website compresses the
            // file (Apache then changes the ETag, but not the date).
            if (entries.isNotEmpty()) {
                prefs.getString(ETAG, null)?.let { setRequestProperty("If-None-Match", it) }
                prefs.getString(MODIFIED, null)?.let { setRequestProperty("If-Modified-Since", it) }
            }
        }
        return try {
            when (connection.responseCode) {
                304 -> false
                200 -> {
                    val text = connection.inputStream.bufferedReader().use { it.readText() }
                    val data = JSONObject(text)
                    val products = data.getJSONArray("products")
                    val shownCount = (0 until products.length()).count { products.getJSONObject(it).optBoolean("active", true) }
                    val before = shown().size
                    // A broken or truncated file never replaces a good copy.
                    if (data.optLong("version") <= 0 || shownCount < 50 || (before > 0 && shownCount < before * 0.9)) {
                        Log.w(TAG, "Catalogue file refused: $shownCount products (had $before)")
                        return false
                    }
                    replaceAll(data)
                    save()
                    prefs.edit()
                        .putString(ETAG, connection.getHeaderField("ETag"))
                        .putString(MODIFIED, connection.getHeaderField("Last-Modified"))
                        .apply()
                    true
                }
                else -> false
            }
        } catch (e: Exception) {
            Log.w(TAG, "Catalogue file not reachable", e)
            false
        } finally {
            connection.disconnect()
        }
    }

    /** Applies what changed since [version]. True when something did. */
    fun fetchChanges(): Boolean {
        if (version <= 0) return false
        val connection = (URL(BuildConfig.CATALOG_SERVER + "api/catalog/changes.php?since=$version").openConnection() as HttpURLConnection).apply {
            connectTimeout = 10_000
            readTimeout = 20_000
        }
        return try {
            if (connection.responseCode != 200) return false
            val data = JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
            val changed = data.optJSONArray("products") ?: JSONArray()
            for (i in 0 until changed.length()) {
                val entry = changed.getJSONObject(i)
                entries[entry.getString("id")] = entry
            }
            version = maxOf(version, data.optLong("version"))
            if (changed.length() > 0) save()
            changed.length() > 0
        } catch (e: Exception) {
            Log.w(TAG, "Catalogue changes not reachable", e)
            false
        } finally {
            connection.disconnect()
        }
    }

    private fun replaceAll(data: JSONObject) {
        val products = data.getJSONArray("products")
        entries.clear()
        for (i in 0 until products.length()) {
            val entry = products.getJSONObject(i)
            entries[entry.getString("id")] = entry
        }
        version = data.optLong("version")
    }

    private fun save() {
        val data = JSONObject().put("version", version).put("products", JSONArray(entries.values))
        val tmp = File(saved.parentFile, "catalog.json.tmp")
        tmp.writeText(data.toString())
        tmp.renameTo(saved)
    }

    private companion object {
        const val TAG = "DASHitCatalog"
        const val ETAG = "etag"
        const val MODIFIED = "modified"
    }
}

/** A JSON object as the plain map Firestore documents give, for the same parser. */
internal fun JSONObject.toPlainMap(): Map<String, Any> {
    val out = HashMap<String, Any>()
    keys().forEach { key -> plain(opt(key))?.let { out[key] = it } }
    return out
}

private fun plain(value: Any?): Any? = when (value) {
    null, JSONObject.NULL -> null
    is JSONObject -> value.toPlainMap()
    is JSONArray -> (0 until value.length()).mapNotNull { plain(value.opt(it)) }
    else -> value
}
