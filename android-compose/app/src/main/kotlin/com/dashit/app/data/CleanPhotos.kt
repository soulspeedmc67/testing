package com.dashit.app.data

import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Which product photos are clean packshots: the product alone on plain white.
 * Items with one are listed first, then items with any other photo, then items
 * without a photo. The list is made by `scripts/clean-photo-index.py` and
 * served at dashit.co.in/catalog/clean-photos-v1.json as photo names
 * ("dsh_<hash>"); a copy is kept on the phone so the order is right offline.
 */
object CleanPhotos {
    private const val URL_LIST = "https://dashit.co.in/catalog/clean-photos-v1.json"
    private val _names = MutableStateFlow<Set<String>>(emptySet())
    val names: StateFlow<Set<String>> = _names.asStateFlow()

    fun load(context: Context) {
        val saved = File(context.filesDir, "clean-photos-v1.json")
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            runCatching { if (saved.exists()) _names.value = parse(saved.readText()) }
            runCatching {
                val connection = URL(URL_LIST).openConnection() as HttpURLConnection
                connection.connectTimeout = 10_000
                connection.readTimeout = 15_000
                val body = connection.inputStream.use { it.readBytes().decodeToString() }
                val fresh = parse(body)
                if (fresh.isNotEmpty()) {
                    _names.value = fresh
                    saved.writeText(body)
                }
            }
        }
    }

    private fun parse(body: String): Set<String> {
        val list = JSONObject(body).optJSONArray("clean") ?: return emptySet()
        return HashSet<String>(list.length() * 2).apply {
            for (i in 0 until list.length()) add(list.getString(i))
        }
    }

    /** 0 clean white photo, 1 other photo, 2 no photo. */
    fun rank(img: String, clean: Set<String>): Int {
        if (img.isBlank()) return 2
        val name = img.substringAfterLast('/').substringBefore('#').substringBefore('.')
        return if (name in clean) 0 else 1
    }
}
