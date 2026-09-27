package com.dashit.app.ui.auth

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.coerceIn
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dashit.app.R
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.auth.AuthRepository
import com.dashit.app.ui.profile.SupportContact
import kotlinx.coroutines.launch

enum class AuthMode { LogIn, SignUp }

/**
 * Full-screen log in / sign up on the brand orange, drawn with the rider
 * artwork: the scooter rider for log in, the grocery rider for sign up. Same
 * screen as the iOS AuthView. Sign-in is the confirm-your-number flow (the
 * Spark plan has no SMS); sign up also asks for a name.
 *
 * Shown once on first launch with "Skip for now" (browsing never needs an
 * account) and from Profile. Calls [onClose] once signed in or dismissed.
 */
@Composable
fun AuthScreen(
    initialMode: AuthMode = AuthMode.LogIn,
    isWelcome: Boolean = false,
    onClose: () -> Unit
) {
    val view = LocalView.current
    val uriHandler = LocalUriHandler.current
    val scope = rememberCoroutineScope()

    var mode by remember { mutableStateOf(initialMode) }
    var name by remember { mutableStateOf("") }
    var digits by remember { mutableStateOf("") }
    var isConfirming by remember { mutableStateOf(false) }
    var isSigningIn by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val valid = AuthRepository.normalizedMobile(digits) != null

    BackHandler(enabled = !isSigningIn) {
        if (isConfirming) isConfirming = false else onClose()
    }

    // A slow bob for the artwork.
    val float by rememberInfiniteTransition(label = "auth_float").animateFloat(
        initialValue = 4f,
        targetValue = -6f,
        animationSpec = infiniteRepeatable(tween(2400), RepeatMode.Reverse),
        label = "auth_float_y"
    )

    fun submit() {
        if (!valid || isSigningIn) return
        isSigningIn = true
        error = null
        scope.launch {
            try {
                AuthRepository.signInWithConfirmedMobile(
                    digits,
                    name.takeIf { mode == AuthMode.SignUp }
                )
                HapticsManager.success(view)
                onClose()
            } catch (e: Exception) {
                HapticsManager.error(view)
                error = e.message
            } finally {
                isSigningIn = false
            }
        }
    }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(listOf(Color(0xFFFF6A1A), Color(0xFFF24E00), Color(0xFFD63800)))
            )
    ) {
        val screenHeight = maxHeight
        val heroHeight = (screenHeight * 0.48f).coerceIn(270.dp, 430.dp)

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .imePadding()
        ) {
            // Hero: brand tile, headline and the artwork.
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(heroHeight)
                    .statusBarsPadding()
                    .padding(top = 44.dp, start = 24.dp, end = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Image(
                    painter = painterResource(R.drawable.brand_tile),
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(56.dp)
                        .shadow(10.dp, RoundedCornerShape(16.dp))
                        .clip(RoundedCornerShape(16.dp))
                        .border(2.dp, Color.White, RoundedCornerShape(16.dp))
                )
                Spacer(Modifier.height(10.dp))
                Text(
                    text = if (mode == AuthMode.SignUp) "Create your account" else "Log in to DASHit",
                    color = Color.White,
                    fontSize = 25.sp,
                    fontWeight = FontWeight.Black
                )
                Text(
                    text = "Groceries at your door in minutes, across Anantnag.",
                    color = Color.White.copy(alpha = 0.85f),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 4.dp)
                )
                AnimatedContent(
                    targetState = mode,
                    transitionSpec = { (scaleIn(initialScale = 0.85f) + fadeIn()) togetherWith fadeOut() },
                    label = "auth_art",
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(top = 8.dp)
                        .graphicsLayer { translationY = float * density }
                ) { current ->
                    Image(
                        painter = painterResource(
                            if (current == AuthMode.SignUp) R.drawable.auth_groceries else R.drawable.auth_scooter
                        ),
                        contentDescription = null,
                        contentScale = ContentScale.Fit,
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }

            // Panel
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = screenHeight - heroHeight)
                    .shadow(24.dp, RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp))
                    .clip(RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp))
                    .background(DashitColors.SurfaceRaised)
                    .navigationBarsPadding()
                    .padding(horizontal = 20.dp, vertical = 22.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                ModeSwitch(mode = mode) {
                    if (it != mode && !isSigningIn) {
                        HapticsManager.selection(view)
                        mode = it
                        error = null
                    }
                }

                AnimatedContent(targetState = isConfirming, label = "auth_step") { confirming ->
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (!confirming) {
                            AnimatedVisibility(
                                visible = mode == AuthMode.SignUp,
                                enter = expandVertically() + fadeIn(),
                                exit = shrinkVertically() + fadeOut()
                            ) {
                                AuthField(
                                    value = name,
                                    placeholder = "Your name",
                                    keyboard = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                                    onChange = { name = it.take(60) }
                                )
                            }
                            AuthField(
                                value = digits,
                                placeholder = "10-digit mobile number",
                                prefix = "+91",
                                highlighted = valid,
                                keyboard = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                onChange = { value ->
                                    digits = value.filter { it.isDigit() }.take(10)
                                    error = null
                                }
                            )
                            AuthButton("Continue", enabled = valid, isBusy = false) {
                                HapticsManager.light(view)
                                isConfirming = true
                            }
                        } else {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(DashitColors.SurfaceMuted)
                                    .padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text("Is this your number?", color = DashitColors.TextMuted, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        "+91 ${digits.take(5)} ${digits.drop(5)}",
                                        color = DashitColors.TextPrimary,
                                        fontSize = 23.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        modifier = Modifier.weight(1f)
                                    )
                                    Text(
                                        "Edit",
                                        color = DashitColors.BrandAccent,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier
                                            .clip(CircleShape)
                                            .background(DashitColors.SurfaceRaised)
                                            .pressable(scale = 0.94f) {
                                                if (!isSigningIn) {
                                                    HapticsManager.light(view)
                                                    isConfirming = false
                                                }
                                            }
                                            .padding(horizontal = 14.dp, vertical = 7.dp)
                                    )
                                }
                                Text(
                                    "Your rider and our store use this number to reach you about deliveries.",
                                    color = DashitColors.TextMuted,
                                    fontSize = 12.sp
                                )
                            }
                            AuthButton(
                                if (mode == AuthMode.SignUp) "Create my account" else "Log in",
                                enabled = !isSigningIn,
                                isBusy = isSigningIn,
                                onClick = ::submit
                            )
                        }
                    }
                }

                error?.let {
                    Text(it, color = DashitColors.Danger, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                }

                // Legal
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("By continuing, you agree to our", color = DashitColors.TextMuted, fontSize = 12.sp)
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            "Terms & Conditions",
                            color = DashitColors.BrandAccent,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.pressable { uriHandler.openUri(SupportContact.TERMS_URL) }
                        )
                        Text("and", color = DashitColors.TextMuted, fontSize = 12.sp)
                        Text(
                            "Privacy Policy",
                            color = DashitColors.BrandAccent,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.pressable { uriHandler.openUri(SupportContact.PRIVACY_URL) }
                        )
                    }
                }
            }
        }

        // Skip for now (first launch) or close.
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .statusBarsPadding()
                .padding(top = 8.dp, end = 16.dp)
        ) {
            if (isWelcome) {
                Row(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.2f))
                        .border(1.dp, Color.White.copy(alpha = 0.3f), CircleShape)
                        .pressable {
                            HapticsManager.light(view)
                            onClose()
                        }
                        .padding(start = 14.dp, end = 10.dp, top = 8.dp, bottom = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Skip for now", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                }
            } else {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.2f))
                        .border(1.dp, Color.White.copy(alpha = 0.3f), CircleShape)
                        .pressable(scale = 0.88f) {
                            HapticsManager.light(view)
                            onClose()
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Filled.Close, contentDescription = "Close", tint = Color.White, modifier = Modifier.size(18.dp))
                }
            }
        }
    }

}

/** Log in | Sign up, with the selected half raised. */
@Composable
private fun ModeSwitch(mode: AuthMode, onSelect: (AuthMode) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(CircleShape)
            .background(DashitColors.SurfaceMuted)
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        listOf(AuthMode.LogIn to "Log in", AuthMode.SignUp to "Sign up").forEach { (option, label) ->
            val selected = option == mode
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(40.dp)
                    .clip(CircleShape)
                    .background(if (selected) DashitColors.Surface else Color.Transparent)
                    .pressable(scale = 0.97f) { onSelect(option) },
                contentAlignment = Alignment.Center
            ) {
                Text(
                    label,
                    color = if (selected) DashitColors.TextPrimary else DashitColors.TextMuted,
                    fontSize = 15.sp,
                    fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold
                )
            }
        }
    }
}

@Composable
private fun AuthField(
    value: String,
    placeholder: String,
    onChange: (String) -> Unit,
    prefix: String? = null,
    highlighted: Boolean = false,
    keyboard: KeyboardOptions = KeyboardOptions.Default
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(54.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(DashitColors.SurfaceMuted)
            .border(
                1.dp,
                if (highlighted) DashitColors.BrandOrange.copy(alpha = 0.7f) else Color.Transparent,
                RoundedCornerShape(14.dp)
            )
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        if (prefix != null) {
            Text(prefix, color = DashitColors.TextSecondary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            Box(Modifier.size(width = 1.dp, height = 22.dp).background(DashitColors.Hairline))
        }
        Box(Modifier.weight(1f)) {
            if (value.isEmpty()) Text(placeholder, color = DashitColors.TextFaint, fontSize = 16.sp)
            BasicTextField(
                value = value,
                onValueChange = onChange,
                singleLine = true,
                keyboardOptions = keyboard,
                textStyle = TextStyle(color = DashitColors.TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.Medium),
                cursorBrush = SolidColor(DashitColors.BrandOrange),
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
private fun AuthButton(label: String, enabled: Boolean, isBusy: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(54.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(if (enabled) DashitColors.BrandOrange else DashitColors.SurfaceMuted)
            .pressable(scale = 0.98f) { if (enabled && !isBusy) onClick() },
        contentAlignment = Alignment.Center
    ) {
        if (isBusy) {
            CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
        } else {
            Text(label, color = if (enabled) Color.White else DashitColors.TextMuted, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }
}
