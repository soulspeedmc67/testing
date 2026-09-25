package com.dashit.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.dashit.app.ui.SplashOverlay
import com.dashit.app.core.design.DashitTheme
import com.dashit.app.data.StoreStatus
import com.dashit.app.data.auth.AuthRepository
import com.dashit.app.data.repository.OrderRepository
import com.dashit.app.ui.storefront.StorefrontScreen
import com.dashit.app.viewmodel.StorefrontViewModel

class MainActivity : ComponentActivity() {
    private val storefrontViewModel: StorefrontViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        // The system splash hands straight over to SplashOverlay, which starts
        // on the same frame, so it leaves without an animation of its own.
        installSplashScreen().setOnExitAnimationListener { provider ->
            provider.remove()
            // Removing the splash re-applies the theme's bar colours; stay edge to edge.
            enableEdgeToEdge()
        }
        enableEdgeToEdge()
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }
        window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        super.onCreate(savedInstanceState)

        // Signed-in shopper, their orders and the store's open/closed switch.
        AuthRepository.init(this)
        OrderRepository.shared.init(this)
        StoreStatus.start()

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
                var showSplash by rememberSaveable { mutableStateOf(true) }
                // The app starts a touch zoomed in behind the splash and settles as it clears.
                var isSettled by rememberSaveable { mutableStateOf(false) }
                val appScale by animateFloatAsState(
                    targetValue = if (isSettled) 1f else 1.04f,
                    // The iOS spring (response 0.5 s, damping 0.86): stiffness = (2π / 0.5)².
                    animationSpec = spring(dampingRatio = 0.86f, stiffness = 158f),
                    label = "app_settle"
                )
                Box(modifier = Modifier.fillMaxSize()) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .graphicsLayer {
                                scaleX = appScale
                                scaleY = appScale
                            }
                    ) {
                        StorefrontScreen(storefrontVm = storefrontViewModel)
                    }
                    if (showSplash) {
                        SplashOverlay(
                            onReveal = { isSettled = true },
                            onFinished = { showSplash = false }
                        )
                    }
                }
            }
        }
    }
}
