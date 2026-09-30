package com.dashit.app.ui.auth

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.isImeVisible
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withLink
import androidx.compose.ui.unit.coerceIn
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dashit.app.R
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.auth.AuthRepository
import com.dashit.app.ui.profile.SupportContact
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.launch

/** LogIn and SignUp share one screen; SignUp also asks for a name. */
enum class AuthMode { LogIn, SignUp }

/** The number, then the WhatsApp code, then a name if the account has none. */
private enum class AuthStep { Number, Code, Name }

private val HeroTop = Color(0xFF0D2F6E)
private val HeroBottom = Color(0xFF040F24)
private val ButtonStart = Color(0xFFFF7A1A)
private val ButtonEnd = Color(0xFFFF4D00)

/**
 * Log in or sign up, kept plain: the scooter rider on a deep brand gradient,
 * one headline, and a phone number with a Continue button. Same screen as
 * the iOS AuthView. The number is the account: a 6-digit code goes to it on
 * WhatsApp and signs the shopper in. Opened from "Sign up" it also asks for
 * a name.
 *
 * Shown once on first launch with "Skip" (browsing never needs an account)
 * and from Profile. Calls [onClose] once signed in or dismissed.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AuthScreen(
    initialMode: AuthMode = AuthMode.LogIn,
    isWelcome: Boolean = false,
    onClose: () -> Unit
) {
    val view = LocalView.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val isSignUp = initialMode == AuthMode.SignUp
    // Just signed in with a new Google account: the number is confirmed once.
    val confirmingForGoogle by AuthRepository.isConfirmingNumberForGoogle.collectAsState()
    // Signing up asks for a name, unless Google is confirming the number
    // (Google shares one, and the name step asks if it doesn't).
    val asksName = isSignUp && !confirmingForGoogle

    var name by remember { mutableStateOf("") }
    var digits by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var step by remember { mutableStateOf(AuthStep.Number) }
    var isSigningIn by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    // The number the last code went to, and when another may be sent.
    var sentTo by remember { mutableStateOf<String?>(null) }
    var resendAt by remember { mutableLongStateOf(0L) }
    val valid = AuthRepository.normalizedMobile(digits) != null
    // Signing up needs a name as well as the number.
    val canContinue = valid && (!asksName || name.isNotBlank())

    // Signed in but nameless: the name step can't be skipped with Back.
    BackHandler(enabled = !isSigningIn && step != AuthStep.Name) {
        if (step == AuthStep.Code) {
            step = AuthStep.Number
            error = null
        } else {
            onClose()
        }
    }

    fun sendCode() {
        if (!valid || isSigningIn) return
        // Back from "Change number" with the same number: the code sent still works.
        if (sentTo == digits && System.currentTimeMillis() < resendAt) {
            step = AuthStep.Code
            return
        }
        isSigningIn = true
        error = null
        scope.launch {
            try {
                val wait = AuthRepository.sendCode(digits)
                sentTo = digits
                resendAt = System.currentTimeMillis() + wait * 1_000L
                code = ""
                step = AuthStep.Code
            } catch (e: AuthRepository.SignInException) {
                HapticsManager.error(view)
                error = e.message
                e.retryAfterSeconds?.let { resendAt = System.currentTimeMillis() + it * 1_000L }
            } finally {
                isSigningIn = false
            }
        }
    }

    fun verify(entered: String) {
        val mobile = sentTo ?: return
        if (entered.length != SIGN_IN_CODE_LENGTH || isSigningIn) return
        isSigningIn = true
        error = null
        scope.launch {
            try {
                val profile = AuthRepository.signIn(mobile, entered, name.trim().takeIf { asksName })
                if (profile.name.isNullOrBlank()) {
                    step = AuthStep.Name
                } else {
                    HapticsManager.success(view)
                    onClose()
                }
            } catch (e: Exception) {
                HapticsManager.error(view)
                error = e.message
                code = ""
            } finally {
                isSigningIn = false
            }
        }
    }

    fun signInWithGoogle() {
        if (isSigningIn) return
        isSigningIn = true
        error = null
        scope.launch {
            try {
                // Null: the sheet was closed, or the number is confirmed next.
                val profile = AuthRepository.signInWithGoogle(context) ?: return@launch
                if (profile.name.isNullOrBlank()) {
                    step = AuthStep.Name
                } else {
                    HapticsManager.success(view)
                    onClose()
                }
            } catch (e: AuthRepository.SignInException) {
                HapticsManager.error(view)
                error = e.message
            } finally {
                isSigningIn = false
            }
        }
    }

    fun saveName() {
        if (name.isBlank() || isSigningIn) return
        isSigningIn = true
        error = null
        scope.launch {
            try {
                AuthRepository.updateName(name)
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

    val float by rememberInfiniteTransition(label = "auth_float").animateFloat(
        initialValue = 3f,
        targetValue = -5f,
        animationSpec = infiniteRepeatable(tween(2800), RepeatMode.Reverse),
        label = "auth_float_y"
    )

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(HeroTop, DashitColors.Midnight, HeroBottom)))
    ) {
        val screenHeight = maxHeight
        val density = LocalDensity.current
        val artHeight = (screenHeight * 0.3f).coerceIn(170.dp, 280.dp)

        // A warm light rising behind the rider, and a faint one in the top corner.
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        colors = listOf(DashitColors.BrandOrange.copy(alpha = 0.42f), Color.Transparent),
                        center = with(density) { Offset((maxWidth / 2).toPx(), (artHeight * 0.95f + 70.dp).toPx()) },
                        radius = with(density) { (maxWidth * 0.75f).toPx() }
                    )
                )
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        colors = listOf(DashitColors.BrandOrange.copy(alpha = 0.14f), Color.Transparent),
                        center = with(density) { Offset(maxWidth.toPx(), 0f) },
                        radius = with(density) { (maxWidth * 0.8f).toPx() }
                    )
                )
        )
        // The panel's colour behind the bottom of the screen, so it runs to the edge.
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .fillMaxHeight(0.3f)
                .background(DashitColors.SurfaceRaised)
        )

        // While the keyboard is up, keep the whole form above it (field,
        // button and any error), not just the text cursor Compose would show.
        val scroll = rememberScrollState()
        val isKeyboardUp = WindowInsets.isImeVisible
        LaunchedEffect(isKeyboardUp) {
            if (isKeyboardUp) snapshotFlow { scroll.maxValue }.collect { max ->
                // Compose's own keep-the-cursor-visible scroll can interrupt
                // this one while the keyboard slides in; the next change retries.
                try {
                    scroll.scrollTo(max)
                } catch (e: CancellationException) {
                    currentCoroutineContext().ensureActive()
                }
            }
        }

        // Below the status bar, so scrolled content never runs under its icons.
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .imePadding()
                .verticalScroll(scroll)
        ) {
            // Skip / close, as plain text
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 20.dp, end = 8.dp, top = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Image(
                    painter = painterResource(R.drawable.splash_logo),
                    contentDescription = "DASHit",
                    modifier = Modifier.size(30.dp)
                )
                Spacer(Modifier.weight(1f))
                if (isWelcome) {
                    Text(
                        "Skip",
                        color = Color.White.copy(alpha = 0.85f),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier
                            .pressable {
                                HapticsManager.light(view)
                                onClose()
                            }
                            .padding(horizontal = 12.dp, vertical = 10.dp)
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .pressable(scale = 0.88f) {
                                HapticsManager.light(view)
                                onClose()
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Filled.Close, contentDescription = "Close", tint = Color.White.copy(alpha = 0.85f), modifier = Modifier.size(22.dp))
                    }
                }
            }

            Image(
                painter = painterResource(R.drawable.auth_scooter),
                contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(artHeight)
                    .padding(top = 8.dp)
                    .graphicsLayer { translationY = float * this.density }
            )

            Text(
                text = "Groceries delivered\nin minutes",
                color = Color.White,
                fontSize = 30.sp,
                lineHeight = 35.sp,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 22.dp, start = 24.dp, end = 24.dp)
            )
            Text(
                text = "Anantnag's everyday essentials, at your door.",
                color = Color.White.copy(alpha = 0.7f),
                fontSize = 15.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp, start = 24.dp, end = 24.dp, bottom = 28.dp)
            )

            // Form
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 300.dp)
                    .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                    .background(DashitColors.SurfaceRaised)
                    .navigationBarsPadding()
                    .padding(start = 24.dp, end = 24.dp, top = 26.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                SectionTitle(
                    when (step) {
                        AuthStep.Name -> "What's your name?"
                        AuthStep.Code -> "Enter the code"
                        AuthStep.Number -> when {
                            confirmingForGoogle -> "Confirm your number"
                            isSignUp -> "Create your account"
                            else -> "Log in or sign up"
                        }
                    }
                )

                if (step == AuthStep.Name) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        AuthField(
                            value = name,
                            placeholder = "Your name",
                            keyboard = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                            onChange = { name = it.take(60); error = null }
                        )
                        AuthButton("Save and continue", enabled = name.isNotBlank() && !isSigningIn, isBusy = isSigningIn, onClick = ::saveName)
                    }
                } else AnimatedContent(targetState = step, label = "auth_step") { current ->
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (current == AuthStep.Number) {
                            if (confirmingForGoogle) {
                                Text(
                                    "Your Google account is connected. Confirm your number with a WhatsApp code once; after that, Google signs you straight in.",
                                    color = DashitColors.TextSecondary,
                                    fontSize = 14.sp,
                                    lineHeight = 20.sp,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                            if (asksName) {
                                AuthField(
                                    value = name,
                                    placeholder = "Your name",
                                    keyboard = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                                    onChange = { name = it.take(60) }
                                )
                            }
                            AuthField(
                                value = digits,
                                placeholder = "Enter mobile number",
                                prefix = "+91",
                                keyboard = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                onChange = { value ->
                                    digits = value.filter { it.isDigit() }.take(10)
                                    error = null
                                }
                            )
                            Text(
                                "We'll send a code to this number on WhatsApp.",
                                color = DashitColors.TextMuted,
                                fontSize = 13.sp
                            )
                            AuthButton("Continue", enabled = canContinue, isBusy = isSigningIn) {
                                HapticsManager.light(view)
                                sendCode()
                            }
                            if (confirmingForGoogle) {
                                Text(
                                    "Cancel",
                                    color = DashitColors.TextSecondary,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(12.dp))
                                        .pressable(scale = 0.97f) {
                                            HapticsManager.light(view)
                                            error = null
                                            AuthRepository.cancelGoogleSignIn()
                                        }
                                        .padding(vertical = 12.dp)
                                )
                            } else {
                                OrDivider()
                                GoogleButton(enabled = !isSigningIn, onClick = ::signInWithGoogle)
                            }
                        } else {
                            SignInCodeStep(
                                mobile = sentTo ?: digits,
                                code = code,
                                onCodeChange = { code = it; error = null },
                                onComplete = { verify(it) },
                                resendAtMillis = resendAt,
                                onResend = {
                                    HapticsManager.light(view)
                                    sendCode()
                                },
                                onChangeNumber = {
                                    HapticsManager.light(view)
                                    step = AuthStep.Number
                                    error = null
                                },
                                enabled = !isSigningIn,
                                boxColor = DashitColors.Surface
                            )
                            AuthButton("Verify", enabled = code.length == SIGN_IN_CODE_LENGTH, isBusy = isSigningIn) {
                                verify(code)
                            }
                        }
                    }
                }

                error?.let {
                    Text(it, color = DashitColors.Danger, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                }

                val linkStyle = TextLinkStyles(SpanStyle(color = DashitColors.TextSecondary, fontWeight = FontWeight.SemiBold))
                Text(
                    text = buildAnnotatedString {
                        append("By continuing, you agree to our ")
                        withLink(LinkAnnotation.Url(SupportContact.TERMS_URL, linkStyle)) { append("Terms") }
                        append(" and ")
                        withLink(LinkAnnotation.Url(SupportContact.PRIVACY_URL, linkStyle)) { append("Privacy Policy") }
                        append(".")
                    },
                    color = DashitColors.TextMuted,
                    fontSize = 12.sp,
                    lineHeight = 17.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

/** "———  or  ———" between the number and Google. */
@Composable
private fun OrDivider() {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Box(Modifier.weight(1f).height(1.dp).background(DashitColors.Hairline))
        Text("or", color = DashitColors.TextFaint, fontSize = 13.sp, fontWeight = FontWeight.Medium)
        Box(Modifier.weight(1f).height(1.dp).background(DashitColors.Hairline))
    }
}

/**
 * "Continue with Google" in Google's light button style (white, grey
 * outline, the four-colour G), the counterpart of iOS's white Apple button
 * on this dark panel.
 */
@Composable
private fun GoogleButton(enabled: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(Color.White)
            .border(1.dp, Color(0xFF747775), RoundedCornerShape(14.dp))
            .pressable(scale = 0.98f) { if (enabled) onClick() },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        Image(painterResource(R.drawable.ic_google_g), contentDescription = null, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(12.dp))
        Text("Continue with Google", color = Color(0xFF1F1F1F), fontSize = 16.sp, fontWeight = FontWeight.Medium)
    }
}

/** "——  Log in or sign up  ——" */
@Composable
private fun SectionTitle(text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.weight(1f).height(1.dp).background(DashitColors.Hairline))
        Text(
            text,
            color = DashitColors.TextSecondary,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 12.dp)
        )
        Box(Modifier.weight(1f).height(1.dp).background(DashitColors.Hairline))
    }
}

@Composable
private fun AuthField(
    value: String,
    placeholder: String,
    onChange: (String) -> Unit,
    prefix: String? = null,
    keyboard: KeyboardOptions = KeyboardOptions.Default
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(DashitColors.Surface)
            .border(1.dp, DashitColors.HairlineStrong, RoundedCornerShape(14.dp))
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (prefix != null) {
            Text(prefix, color = DashitColors.TextPrimary, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
            Box(Modifier.size(width = 1.dp, height = 24.dp).background(DashitColors.HairlineStrong))
        }
        Box(Modifier.weight(1f)) {
            if (value.isEmpty()) Text(placeholder, color = DashitColors.TextFaint, fontSize = 17.sp)
            BasicTextField(
                value = value,
                onValueChange = onChange,
                singleLine = true,
                keyboardOptions = keyboard,
                textStyle = TextStyle(color = DashitColors.TextPrimary, fontSize = 17.sp, fontWeight = FontWeight.Medium, letterSpacing = 0.4.sp),
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
            .height(56.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(
                if (enabled) Brush.horizontalGradient(listOf(ButtonStart, ButtonEnd))
                else SolidColor(DashitColors.SurfaceMuted)
            )
            .pressable(scale = 0.98f) { if (enabled && !isBusy) onClick() },
        contentAlignment = Alignment.Center
    ) {
        if (isBusy) {
            CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
        } else {
            Text(label, color = if (enabled) Color.White else DashitColors.TextMuted, fontSize = 17.sp, fontWeight = FontWeight.Bold)
        }
    }
}
