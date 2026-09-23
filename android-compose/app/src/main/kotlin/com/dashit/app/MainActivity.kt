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

        setContent {
            DashitTheme {
                StorefrontScreen(
                    storefrontVm = storefrontViewModel
                )
            }
        }
    }
}
