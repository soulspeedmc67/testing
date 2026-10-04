package com.dashit.app.ui.map

import android.content.Context
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.views.CustomZoomButtonsController
import org.osmdroid.views.MapView
import java.io.File

/**
 * One look for every map in the app: OpenStreetMap tiles, quietened in light
 * mode and turned into a calm charcoal map in dark mode (as Apple Maps does on
 * the iPhone app), so a bright white map never flashes up in a dark app.
 */
object MapStyle {
    /** Light: a little less colour, so the brand pins and route stand out. */
    private val light = ColorMatrixColorFilter(ColorMatrix().apply { setSaturation(0.72f) })

    /**
     * Dark: calm Apple Maps style charcoal map with soft white road labels
     * and subtle navy water tones, avoiding harsh inverted bright edges.
     */
    private val dark = ColorMatrixColorFilter(
        ColorMatrix().apply {
            setSaturation(0.18f)
            postConcat(
                ColorMatrix(
                    floatArrayOf(
                        -0.78f, 0f, 0f, 0f, 218f,
                        0f, -0.78f, 0f, 0f, 222f,
                        0f, 0f, -0.76f, 0f, 230f,
                        0f, 0f, 0f, 1f, 0f
                    )
                )
            )
        }
    )

    /** Tile cache and the user agent OpenStreetMap asks for; safe to call more than once. */
    fun configure(context: Context) {
        val config = Configuration.getInstance()
        if (config.userAgentValue == "DASHit-App/1.0 (https://dashit.co.in)") return
        config.load(context, context.getSharedPreferences("osmdroid", Context.MODE_PRIVATE))
        config.userAgentValue = "DASHit-App/1.0 (https://dashit.co.in)"
        val basePath = File(context.cacheDir, "osmdroid").apply { mkdirs() }
        config.osmdroidBasePath = basePath
        config.osmdroidTileCache = File(basePath, "tiles").apply { mkdirs() }
        // Tiles kept for a week: a returning shopper's map draws from the phone.
        config.expirationOverrideDuration = 7L * 24 * 60 * 60 * 1000
    }

    /** A map with the app's look, no zoom buttons and pinch to zoom. */
    fun newMap(context: Context, isDark: Boolean): MapView {
        configure(context)
        return MapView(context).apply {
            setTileSource(TileSourceFactory.MAPNIK)
            setMultiTouchControls(true)
            isTilesScaledToDpi = true
            isVerticalMapRepetitionEnabled = false
            minZoomLevel = 11.0
            maxZoomLevel = 19.5
            zoomController.setVisibility(CustomZoomButtonsController.Visibility.NEVER)
            apply(this, isDark)
        }
    }

    fun apply(map: MapView, isDark: Boolean) {
        map.overlayManager.tilesOverlay.setColorFilter(if (isDark) dark else light)
        map.overlayManager.tilesOverlay.loadingBackgroundColor = if (isDark) 0xFF121316.toInt() else 0xFFEDEEF0.toInt()
        map.overlayManager.tilesOverlay.loadingLineColor = if (isDark) 0xFF121316.toInt() else 0xFFEDEEF0.toInt()
        map.setBackgroundColor(if (isDark) 0xFF121316.toInt() else 0xFFEDEEF0.toInt())
        map.invalidate()
    }
}
