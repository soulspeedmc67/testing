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
import androidx.compose.runtime.LaunchedEffect
import com.dashit.app.core.design.AppReveal
import com.dashit.app.ui.auth.AuthScreen
import com.dashit.app.core.design.DashitTheme
import com.dashit.app.data.OrderNotifications
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

        // Product photos: saved on the phone after the first download.
        coil.Coil.setImageLoader(com.dashit.app.data.ProductPhotos.imageLoader(this))

        // Signed-in shopper, their orders and the store's open/closed switch.
        AuthRepository.init(this)
        OrderRepository.shared.init(this)
        StoreStatus.start()
        OrderNotifications.createChannel(this)

        // Initialize OpenStreetMap (osmdroid) configuration with compliant User-Agent & dedicated tile cache
        val osmConfig = org.osmdroid.config.Configuration.getInstance()
        osmConfig.load(this, getSharedPreferences("osmdroid", MODE_PRIVATE))
        osmConfig.userAgentValue = "DASHit-App/1.0 (https://dashit.in; support@dashit.in)"
        val basePath = java.io.File(cacheDir, "osmdroid").apply { mkdirs() }
        val tileCache = java.io.File(basePath, "tiles").apply { mkdirs() }
        osmConfig.osmdroidBasePath = basePath
        osmConfig.osmdroidTileCache = tileCache

        // Log in / sign up, once, on the very first launch; the splash clears
        // onto it. "Skip for now" goes straight to the shop.
        val prefs = getSharedPreferences("dashit_prefs", MODE_PRIVATE)
        val showWelcomeAtStart = !prefs.getBoolean(WELCOME_SEEN_KEY, false) && AuthRepository.user.value == null

        // The splash covers the first seconds: entrances wait for it to clear.
        AppReveal.coversLaunch = true

        setContent {
            DashitTheme {
                var showSplash by rememberSaveable { mutableStateOf(true) }
                var showWelcomeAuth by rememberSaveable { mutableStateOf(showWelcomeAtStart) }
                // Also covers a restore where neither is showing any more.
                LaunchedEffect(showSplash, showWelcomeAuth) {
                    if (!showSplash && !showWelcomeAuth) AppReveal.reveal()
                }
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
                    if (showWelcomeAuth) {
                        AuthScreen(isWelcome = true, onClose = {
                            prefs.edit().putBoolean(WELCOME_SEEN_KEY, true).apply()
                            showWelcomeAuth = false
                            AppReveal.reveal()
                        })
                    }
                    if (showSplash) {
                        SplashOverlay(
                            onReveal = {
                                isSettled = true
                                // The welcome sign-in still covers the shop on a first launch.
                                if (!showWelcomeAuth) AppReveal.reveal()
                            },
                            onFinished = { showSplash = false }
                        )
                    }
                }
            }
        }
    }

    private companion object {
        const val WELCOME_SEEN_KEY = "seen_auth_welcome"
    }

    // The UPI app hands its answer back here; Razorpay's SDK reads it.
    @Deprecated("Razorpay's SDK opens the UPI app with startActivityForResult.")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        com.dashit.app.data.OnlinePayment.onActivityResult(requestCode, resultCode, data)
    }

    override fun onStart() {
        super.onStart()
        OrderNotifications.isAppInForeground = true
        OrderNotifications.isAppInBackground = false
        // Celebrate a delivery that happened while the app was away.
        OrderRepository.shared.noteDelivery()
    }

    override fun onStop() {
        OrderNotifications.isAppInForeground = false
        OrderNotifications.isAppInBackground = true
        super.onStop()
    }
}
