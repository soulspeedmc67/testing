package com.dashit.app.ui.auth

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.auth.AuthRepository
import com.dashit.app.data.model.UserProfile
import kotlinx.coroutines.launch

private enum class SheetStep { Google, Number, Code, Name }

/**
 * Sign-in in a bottom sheet with the same steps as the sign-in screen: Google,
 * then the mobile number the delivery person can call (once, not verified),
 * then a name if Google gave none. Opened at checkout, so the order goes
 * straight on once the account has all three.
 *
 * With [confirmItsYou] it only asks for Google again: Firebase wants a fresh
 * sign-in before it deletes an account.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignInSheet(
    onSignedIn: (UserProfile) -> Unit,
    onDismiss: () -> Unit,
    confirmItsYou: Boolean = false
) {
    val view = LocalView.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val signedIn = AuthRepository.user.value
    fun stepFor(profile: UserProfile?): SheetStep = when {
        profile == null -> SheetStep.Google
        profile.mobile.isBlank() -> SheetStep.Number
        profile.name.isNullOrBlank() -> SheetStep.Name
        else -> SheetStep.Google
    }
    var digits by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var step by remember { mutableStateOf(if (confirmItsYou) SheetStep.Google else stepFor(signedIn)) }
    var isBusy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val valid = AuthRepository.normalizedMobile(digits) != null
    var code by remember { mutableStateOf("") }
    var otpTicket by remember { mutableStateOf<String?>(null) }
    var resendAt by remember { mutableStateOf(0L) }
    val numberFocus = remember { FocusRequester() }
    val nameFocus = remember { FocusRequester() }

    /** The next thing the account still needs, or hand it back. */
    fun next(profile: UserProfile) {
        val needed = stepFor(profile)
        if (confirmItsYou || (profile.mobile.isNotBlank() && !profile.name.isNullOrBlank())) {
            HapticsManager.success(view)
            onSignedIn(profile)
        } else {
            step = needed
        }
    }

    fun run(block: suspend () -> UserProfile?) {
        if (isBusy) return
        isBusy = true
        error = null
        scope.launch {
            try {
                block()?.let(::next)
            } catch (e: Exception) {
                HapticsManager.error(view)
                error = e.message
            } finally {
                isBusy = false
            }
        }
    }

    /** Texts a code if the server checks numbers; until it does, just saves the number. */
    fun saveMobile() {
        if (!valid || isBusy) return
        isBusy = true
        error = null
        scope.launch {
            try {
                val request = AuthRepository.requestOtp(digits)
                if (!request.configured) {
                    next(AuthRepository.saveMobile(digits))
                } else {
                    otpTicket = request.ticket
                    code = ""
                    resendAt = System.currentTimeMillis() + request.resendAfterSeconds * 1_000L
                    step = SheetStep.Code
                }
            } catch (e: Exception) {
                HapticsManager.error(view)
                error = e.message
                (e as? AuthRepository.SignInException)?.retryAfterSeconds?.let { resendAt = System.currentTimeMillis() + it * 1_000L }
            } finally {
                isBusy = false
            }
        }
    }

    fun verifyCode(entered: String) {
        val ticket = otpTicket ?: return
        if (entered.length != OTP_LENGTH || isBusy) return
        run {
            try {
                AuthRepository.verifyOtp(digits, entered, ticket)
            } catch (e: Exception) {
                code = ""
                throw e
            }
        }
    }


    ModalBottomSheet(
        onDismissRequest = { if (!isBusy) onDismiss() },
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = DashitColors.Surface,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)
    ) {
        AnimatedContent(
            targetState = step,
            transitionSpec = {
                val forward = targetState.ordinal > initialState.ordinal
                (slideInHorizontally { if (forward) it / 3 else -it / 3 } + fadeIn()) togetherWith
                    (slideOutHorizontally { if (forward) -it / 3 else it / 3 } + fadeOut())
            },
            label = "sign_in_step"
        ) { current ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .imePadding()
                    .padding(horizontal = 20.dp)
                    .padding(bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                when (current) {
                    SheetStep.Google -> {
                        Heading(
                            if (confirmItsYou) "Confirm it's you" else "Log in to order",
                            if (confirmItsYou) "Sign in with Google again to continue."
                            else "Your Google account keeps your orders and addresses, on any phone."
                        )
                        error?.let { Text(it, color = DashitColors.Danger, fontSize = 13.sp) }
                        GoogleButton(enabled = !isBusy) {
                            HapticsManager.light(view)
                            run { AuthRepository.signInWithGoogle(context) }
                        }
                    }

                    SheetStep.Number -> {
                        Heading("Your mobile number", "So the delivery person can call you. We only call about your order.")
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(56.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(DashitColors.SurfaceRaised)
                                .border(1.dp, if (valid) DashitColors.BrandOrange.copy(alpha = 0.7f) else DashitColors.Hairline, RoundedCornerShape(16.dp))
                                .padding(horizontal = 16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text("+91", color = DashitColors.TextSecondary, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
                            Box(Modifier.weight(1f)) {
                                if (digits.isEmpty()) Text("10-digit mobile number", color = DashitColors.TextFaint, fontSize = 17.sp)
                                BasicTextField(
                                    value = digits,
                                    onValueChange = { value -> digits = value.filter { it.isDigit() }.take(10); error = null },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                    textStyle = TextStyle(color = DashitColors.TextPrimary, fontSize = 17.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.sp),
                                    cursorBrush = SolidColor(DashitColors.BrandOrange),
                                    modifier = Modifier.fillMaxWidth().focusRequester(numberFocus)
                                )
                            }
                        }
                        LaunchedEffect(Unit) { runCatching { numberFocus.requestFocus() } }
                        error?.let { Text(it, color = DashitColors.Danger, fontSize = 13.sp) }
                        PrimaryButton("Continue", enabled = valid, isBusy = isBusy) {
                            HapticsManager.light(view)
                            saveMobile()
                        }
                    }

                    SheetStep.Code -> {
                        Heading("Enter the code", null)
                        OtpEntry(
                            mobile = digits,
                            code = code,
                            onCodeChange = { code = it; error = null },
                            onComplete = ::verifyCode,
                            resendAtMillis = resendAt,
                            onResend = { saveMobile() },
                            onChangeNumber = {
                                step = SheetStep.Number
                                error = null
                            },
                            enabled = !isBusy,
                            boxColor = DashitColors.SurfaceRaised
                        )
                        error?.let { Text(it, color = DashitColors.Danger, fontSize = 13.sp) }
                        PrimaryButton("Verify", enabled = code.length == OTP_LENGTH, isBusy = isBusy) {
                            verifyCode(code)
                        }
                    }

                    SheetStep.Name -> {
                        Heading("What's your name?", "So the rider knows who to hand the order to.")
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(56.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(DashitColors.SurfaceRaised)
                                .border(1.dp, if (name.isNotBlank()) DashitColors.BrandOrange.copy(alpha = 0.7f) else DashitColors.Hairline, RoundedCornerShape(16.dp))
                                .padding(horizontal = 16.dp),
                            contentAlignment = Alignment.CenterStart
                        ) {
                            if (name.isEmpty()) Text("Your name", color = DashitColors.TextFaint, fontSize = 17.sp)
                            BasicTextField(
                                value = name,
                                onValueChange = { name = it.take(60); error = null },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                                textStyle = TextStyle(color = DashitColors.TextPrimary, fontSize = 17.sp, fontWeight = FontWeight.SemiBold),
                                cursorBrush = SolidColor(DashitColors.BrandOrange),
                                modifier = Modifier.fillMaxWidth().focusRequester(nameFocus)
                            )
                        }
                        LaunchedEffect(Unit) { runCatching { nameFocus.requestFocus() } }
                        error?.let { Text(it, color = DashitColors.Danger, fontSize = 13.sp) }
                        PrimaryButton("Save and continue", enabled = name.isNotBlank(), isBusy = isBusy) {
                            run { AuthRepository.updateName(name) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Heading(title: String, subtitle: String?) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(title, color = DashitColors.TextPrimary, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
        if (subtitle != null) Text(subtitle, color = DashitColors.TextMuted, fontSize = 14.sp, lineHeight = 19.sp)
    }
}

@Composable
private fun PrimaryButton(label: String, enabled: Boolean, isBusy: Boolean, onClick: () -> Unit) {
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
