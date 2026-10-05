package com.dashit.app

import android.os.Bundle
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
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

class MainActivity : ComponentActivity(), com.razorpay.PaymentResultWithDataListener {
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

        com.dashit.app.core.design.ThemePreference.init(this)
        com.dashit.app.data.AddressBook.init(this)
        // Signed-in shopper, their orders and the store's open/closed switch.
        AuthRepository.init(this)
        com.dashit.app.data.Push.init(this)
        // Order notifications by push, for whoever is signed in (again after each sign-in).
        // Signed in or not, the app joins the "Notify customers" topic (register()
        // does that first, then the order part only for a signed-in shopper).
        lifecycleScope.launch {
            AuthRepository.user.collect { com.dashit.app.data.Push.register() }
        }
        OrderRepository.shared.init(this)
        StoreStatus.start()
        com.dashit.app.data.Coupons.start()
        OrderNotifications.createChannel(this)
        // Razorpay's checkout, warmed up so it opens at once at "Pay".
        com.dashit.app.data.OnlinePayment.preload(this)

        // Initialize OpenStreetMap (osmdroid) configuration with compliant User-Agent & dedicated tile cache
        val osmConfig = org.osmdroid.config.Configuration.getInstance()
        osmConfig.load(this, getSharedPreferences("osmdroid", MODE_PRIVATE))
        osmConfig.userAgentValue = "DASHit-App/1.0 (https://dashit.co.in)"
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
                // Status and navigation bar icons follow the app's light or dark look.
                val isDark = com.dashit.app.core.design.DashitColors.isDark
                androidx.compose.runtime.SideEffect {
                    androidx.core.view.WindowCompat.getInsetsController(window, window.decorView).apply {
                        isAppearanceLightStatusBars = !isDark
                        isAppearanceLightNavigationBars = !isDark
                    }
                }
                var showSplash by rememberSaveable { mutableStateOf(true) }
                var showWelcomeAuth by rememberSaveable { mutableStateOf(showWelcomeAtStart) }
                // Also covers a restore where neither is showing any more.
                LaunchedEffect(showSplash, showWelcomeAuth) {
                    if (!showSplash && !showWelcomeAuth) AppReveal.reveal()
                }
                Box(modifier = Modifier.fillMaxSize()) {
                    StorefrontScreen(storefrontVm = storefrontViewModel)
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

    // Razorpay's checkout reports back here; the payment code does the rest.
    override fun onPaymentSuccess(paymentId: String?, data: com.razorpay.PaymentData?) {
        com.dashit.app.data.OnlinePayment.onPaymentSuccess(paymentId, data)
    }

    override fun onPaymentError(code: Int, description: String?, data: com.razorpay.PaymentData?) {
        com.dashit.app.data.OnlinePayment.onPaymentError(code, description)
    }

    // A UPI app opened directly hands its answer back here; Razorpay's kit reads it.
    @Deprecated("Razorpay's kit opens the UPI app with startActivityForResult.")
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
