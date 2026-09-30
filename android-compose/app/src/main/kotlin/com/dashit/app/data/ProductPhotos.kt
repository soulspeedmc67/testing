package com.dashit.app.data

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import coil.ImageLoader
import coil.disk.DiskCache
import coil.imageLoader
import coil.intercept.Interceptor
import coil.request.CachePolicy
import coil.request.ImageRequest
import coil.request.ImageResult

/**
 * Product photos kept on the phone, the same way as the iPhone app
 * (`ProductPhotoStore.swift`). Photos stay web links (the shop hosts none),
 * but every photo is saved to the app's cache the first time it downloads,
 * whatever the photo's server says about caching, so after that it shows
 * instantly and offline. Photos for the home feed are fetched ahead on Wi-Fi.
 */
object ProductPhotos {
    private val offFullSize = Regex("\\.full\\.(jpg|jpeg|png|webp)$", RegexOption.IGNORE_CASE)

    /**
     * Resolves product photo URLs:
     * 1. Relative catalog paths (e.g. /products/catalog/...) map directly to Hostinger production CDN (https://dashit.co.in).
     * 2. Open Food Facts links point at the full original (~700 KB); the same
     *    photo at 400px (~30 KB) is plenty on a phone and loads far faster.
     */
    fun displayUrl(url: String): String {
        if (url.isBlank()) return url
        val trimmed = url.trim()
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
            val path = if (trimmed.startsWith("/")) trimmed else "/$trimmed"
            return "https://dashit.co.in$path"
        }
        if (!trimmed.contains("openfoodfacts.org") && !trimmed.contains("openbeautyfacts.org")) return trimmed
        return trimmed.replace(offFullSize) { ".400." + it.groupValues[1] }
    }

    /** The app-wide image loader: 300 MB of saved photos, cache headers ignored. */
    fun imageLoader(context: Context): ImageLoader =
        ImageLoader.Builder(context)
            .components { add(SmallerOpenFoodFactsPhotos()) }
            .respectCacheHeaders(false)
            .diskCache {
                DiskCache.Builder()
                    .directory(context.cacheDir.resolve("product_photos"))
                    .maxSizeBytes(300L * 1024 * 1024)
                    .build()
            }
            .crossfade(true)
            .build()

    /** Saves photos ahead of time, only on Wi-Fi (never on mobile data). */
    fun prefetch(context: Context, urls: List<String>) {
        if (!isUnmetered(context)) return
        val loader = context.imageLoader
        urls.map { displayUrl(it) }.filter { it.startsWith("http") }.distinct().take(300).forEach { url ->
            loader.enqueue(
                ImageRequest.Builder(context)
                    .data(url)
                    .memoryCachePolicy(CachePolicy.DISABLED)
                    .size(400)
                    .build()
            )
        }
    }

    private fun isUnmetered(context: Context): Boolean {
        val connectivity = context.getSystemService(ConnectivityManager::class.java) ?: return false
        val capabilities = connectivity.getNetworkCapabilities(connectivity.activeNetwork) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
    }

    private class SmallerOpenFoodFactsPhotos : Interceptor {
        override suspend fun intercept(chain: Interceptor.Chain): ImageResult {
            val data = chain.request.data
            if (data is String) {
                val resolved = displayUrl(data)
                if (resolved != data) return chain.proceed(chain.request.newBuilder().data(resolved).build())
            }
            return chain.proceed(chain.request)
        }
    }
}
