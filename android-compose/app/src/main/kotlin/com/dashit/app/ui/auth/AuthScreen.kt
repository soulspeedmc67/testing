package com.dashit.app.ui.auth

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.ShareLocation
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
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
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

enum class AuthMode { LogIn, SignUp }

/** One page of the artwork carousel above the form. */
private data class AuthSlide(val art: Int, val title: String, val subtitle: String)

private val SLIDES = listOf(
    AuthSlide(R.drawable.auth_scooter, "Groceries at your door, in minutes", "From our Anantnag store to your street."),
    AuthSlide(R.drawable.auth_groceries, "Fresh picks, carefully packed", "Dairy, fruit, staples, snacks and more."),
    AuthSlide(R.drawable.auth_flying_box, "Follow every order, live", "Watch your rider right up to your door.")
)

private val MidnightDeep = Color(0xFF040F24)
private val OnMidnightMuted = Color.White.copy(alpha = 0.68f)

/**
 * Full-screen log in / sign up, the same screen as the iOS AuthView: the
 * splash's midnight with a soft orange glow behind the brand artwork, which
 * turns slowly with a caption each, and a clean form panel below. Sign-in is
 * the confirm-your-number flow (the Spark plan has no SMS); sign up also asks
 * for a name.
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
    val pager = rememberPagerState { SLIDES.size }

    BackHandler(enabled = !isSigningIn) {
        if (isConfirming) isConfirming = false else onClose()
    }

    // The artwork turns on its own until the shopper starts typing.
    val isTyping = digits.isNotEmpty() || name.isNotEmpty()
    LaunchedEffect(isTyping) {
        if (isTyping) return@LaunchedEffect
        while (true) {
            delay(4200)
            pager.animateScrollToPage((pager.currentPage + 1) % SLIDES.size, animationSpec = tween(700))
        }
    }

    // A slow bob for the artwork.
    val float by rememberInfiniteTransition(label = "auth_float").animateFloat(
        initialValue = 3f,
        targetValue = -5f,
        animationSpec = infiniteRepeatable(tween(2600), RepeatMode.Reverse),
        label = "auth_float_y"
    )

    fun submit() {
        if (!valid || isSigningIn) return
        isSigningIn = true
        error = null
        scope.launch {
            try {
                AuthRepository.signInWithConfirmedMobile(digits, name.takeIf { mode == AuthMode.SignUp })
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
            .background(Brush.verticalGradient(listOf(DashitColors.Midnight, MidnightDeep)))
    ) {
        val screenHeight = maxHeight
        val artHeight = (screenHeight * 0.24f).coerceIn(150.dp, 230.dp)

        // The panel's colour behind the bottom of the screen, so it runs on to
        // the edge on tall screens.
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .fillMaxHeight(0.3f)
                .background(DashitColors.SurfaceRaised)
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .imePadding()
        ) {
            // Brand lockup, and Skip / close
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(start = 20.dp, end = 16.dp, top = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Image(
                    painter = painterResource(R.drawable.splash_logo),
                    contentDescription = null,
                    modifier = Modifier.size(28.dp)
                )
                Spacer(Modifier.width(8.dp))
                Image(
                    painter = painterResource(R.drawable.splash_wordmark),
                    contentDescription = "DASHit",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.height(17.dp)
                )
                Spacer(Modifier.weight(1f))
                if (isWelcome) {
                    Text(
                        "Skip",
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier
                            .clip(CircleShape)
                            .border(1.dp, Color.White.copy(alpha = 0.18f), CircleShape)
                            .pressable {
                                HapticsManager.light(view)
                                onClose()
                            }
                            .padding(horizontal = 16.dp, vertical = 7.dp)
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .border(1.dp, Color.White.copy(alpha = 0.18f), CircleShape)
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

            // Artwork carousel on a soft orange glow
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(artHeight + 24.dp)
                    .padding(top = 12.dp),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(artHeight * 1.5f)
                        .background(
                            Brush.radialGradient(
                                listOf(DashitColors.BrandOrange.copy(alpha = 0.30f), Color.Transparent)
                            )
                        )
                )
                HorizontalPager(
                    state = pager,
                    modifier = Modifier.fillMaxSize()
                ) { page ->
                    Image(
                        painter = painterResource(SLIDES[page].art),
                        contentDescription = null,
                        contentScale = ContentScale.Fit,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 40.dp)
                            .graphicsLayer { translationY = float * density }
                    )
                }
            }

            // Caption for the page in view
            AnimatedContent(
                targetState = pager.currentPage,
                transitionSpec = { fadeIn(tween(350)) togetherWith fadeOut(tween(200)) },
                label = "auth_caption",
                modifier = Modifier.fillMaxWidth()
            ) { page ->
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 28.dp, vertical = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // Two lines kept for every title, so turning pages never moves the form.
                    Text(
                        SLIDES[page].title,
                        color = Color.White,
                        fontSize = 25.sp,
                        lineHeight = 30.sp,
                        fontWeight = FontWeight.ExtraBold,
                        textAlign = TextAlign.Center,
                        minLines = 2,
                        maxLines = 2
                    )
                    Text(
                        SLIDES[page].subtitle,
                        color = OnMidnightMuted,
                        fontSize = 14.sp,
                        textAlign = TextAlign.Center,
                        maxLines = 1
                    )
                }
            }

            PageDots(count = SLIDES.size, current = pager.currentPage)

            // What every order gets
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 18.dp),
                horizontalArrangement = Arrangement.spacedBy(14.dp, Alignment.CenterHorizontally)
            ) {
                TrustItem(Icons.Filled.LocalShipping, "Free over ₹299")
                TrustItem(Icons.Filled.ShareLocation, "Live tracking")
                TrustItem(Icons.Filled.Payments, "Cash on delivery")
            }

            // Form panel
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 320.dp)
                    .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                    .background(DashitColors.SurfaceRaised)
                    .border(
                        1.dp,
                        Brush.verticalGradient(listOf(DashitColors.EdgeHighlight, Color.Transparent)),
                        RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)
                    )
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
                                    label = "Your name",
                                    placeholder = "First and last name",
                                    keyboard = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                                    onChange = { name = it.take(60) }
                                )
                            }
                            AuthField(
                                value = digits,
                                label = "Mobile number",
                                placeholder = "10-digit number",
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
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 2.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("By continuing, you agree to our", color = DashitColors.TextMuted, fontSize = 12.sp)
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            "Terms & Conditions",
                            color = DashitColors.TextSecondary,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.pressable { uriHandler.openUri(SupportContact.TERMS_URL) }
                        )
                        Text("and", color = DashitColors.TextMuted, fontSize = 12.sp)
                        Text(
                            "Privacy Policy",
                            color = DashitColors.TextSecondary,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.pressable { uriHandler.openUri(SupportContact.PRIVACY_URL) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PageDots(count: Int, current: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally)
    ) {
        repeat(count) { index ->
            val selected = index == current
            val width by animateDpAsState(if (selected) 18.dp else 6.dp, label = "dot_width")
            Box(
                modifier = Modifier
                    .size(width = width, height = 6.dp)
                    .clip(CircleShape)
                    .background(if (selected) DashitColors.BrandOrange else Color.White.copy(alpha = 0.25f))
            )
        }
    }
}

@Composable
private fun TrustItem(icon: ImageVector, label: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(5.dp)
    ) {
        Icon(icon, contentDescription = null, tint = DashitColors.BrandAccent, modifier = Modifier.size(14.dp))
        Text(label, color = Color.White.copy(alpha = 0.8f), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
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
                    .border(1.dp, if (selected) DashitColors.Hairline else Color.Transparent, CircleShape)
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
    label: String,
    placeholder: String,
    onChange: (String) -> Unit,
    prefix: String? = null,
    highlighted: Boolean = false,
    keyboard: KeyboardOptions = KeyboardOptions.Default
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, color = DashitColors.TextSecondary, fontSize = 12.5.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 2.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(DashitColors.Surface)
                .border(
                    1.dp,
                    if (highlighted) DashitColors.BrandOrange.copy(alpha = 0.8f) else DashitColors.Hairline,
                    RoundedCornerShape(14.dp)
                )
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (prefix != null) {
                Text(prefix, color = DashitColors.TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                Box(Modifier.size(width = 1.dp, height = 22.dp).background(DashitColors.Hairline))
            }
            Box(Modifier.weight(1f)) {
                if (value.isEmpty()) Text(placeholder, color = DashitColors.TextFaint, fontSize = 16.sp)
                BasicTextField(
                    value = value,
                    onValueChange = onChange,
                    singleLine = true,
                    keyboardOptions = keyboard,
                    textStyle = TextStyle(color = DashitColors.TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.Medium, letterSpacing = 0.3.sp),
                    cursorBrush = SolidColor(DashitColors.BrandOrange),
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

@Composable
private fun AuthButton(label: String, enabled: Boolean, isBusy: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(54.dp)
            .clip(RoundedCornerShape(14.dp))
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
