package com.dashit.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import com.dashit.app.core.design.DashitTheme
import com.dashit.app.ui.storefront.StorefrontScreen
import com.dashit.app.viewmodel.StorefrontViewModel

class MainActivity : ComponentActivity() {
    private val storefrontViewModel: StorefrontViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }
        window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        super.onCreate(savedInstanceState)

        // Initialize OpenStreetMap (osmdroid) configuration with compliant User-Agent & dedicated tile cache
        val osmConfig = org.osmdroid.config.Configuration.getInstance()
        osmConfig.load(this, getSharedPreferences("osmdroid", MODE_PRIVATE))
        osmConfig.userAgentValue = "DASHit-App/1.0 (https://dashit.in; support@dashit.in)"
        val basePath = java.io.File(cacheDir, "osmdroid").apply { mkdirs() }
        val tileCache = java.io.File(basePath, "tiles").apply { mkdirs() }
        osmConfig.osmdroidBasePath = basePath
        osmConfig.osmdroidTileCache = tileCache

        setContent {
            DashitTheme {
                StorefrontScreen(
                    storefrontVm = storefrontViewModel
                )
            }
        }
    }
}
