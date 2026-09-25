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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
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
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.auth.AuthRepository
import com.dashit.app.data.model.UserProfile
import kotlinx.coroutines.launch

/**
 * Confirm-your-number sign-in, the same flow as the web and iOS apps: type
 * the number, see it back with an Edit button, confirm. No code is sent (the
 * Spark plan has no SMS); the confirmed number goes on the order for the rider.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PhoneConfirmSheet(
    onSignedIn: (UserProfile) -> Unit,
    onDismiss: () -> Unit
) {
    val view = LocalView.current
    val scope = rememberCoroutineScope()
    var digits by remember { mutableStateOf("") }
    var isConfirming by remember { mutableStateOf(false) }
    var isSigningIn by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val valid = AuthRepository.normalizedMobile(digits) != null
    val focus = remember { FocusRequester() }

    ModalBottomSheet(
        onDismissRequest = { if (!isSigningIn) onDismiss() },
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = DashitColors.Surface,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)
    ) {
        AnimatedContent(
            targetState = isConfirming,
            transitionSpec = {
                val forward = targetState
                (slideInHorizontally { if (forward) it / 3 else -it / 3 } + fadeIn()) togetherWith
                    (slideOutHorizontally { if (forward) -it / 3 else it / 3 } + fadeOut())
            },
            label = "phone_step"
        ) { confirming ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .imePadding()
                    .padding(horizontal = 20.dp)
                    .padding(bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                if (!confirming) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Your phone number", color = DashitColors.TextPrimary, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
                        Text("The rider calls this number if they need directions.", color = DashitColors.TextMuted, fontSize = 14.sp)
                    }
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
                                modifier = Modifier.fillMaxWidth().focusRequester(focus)
                            )
                        }
                    }
                    LaunchedEffect(Unit) { runCatching { focus.requestFocus() } }
                    error?.let { Text(it, color = DashitColors.Danger, fontSize = 13.sp) }
                    PrimaryButton("Continue", enabled = valid, isBusy = false) {
                        HapticsManager.light(view)
                        isConfirming = true
                    }
                } else {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier.size(56.dp).clip(CircleShape).background(DashitColors.BrandOrange.copy(alpha = 0.14f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Filled.Phone, contentDescription = null, tint = DashitColors.BrandOrange, modifier = Modifier.size(26.dp))
                        }
                        Text("Is this your number?", color = DashitColors.TextMuted, fontSize = 14.sp)
                        Text(
                            "+91 ${digits.take(5)} ${digits.drop(5)}",
                            color = DashitColors.TextPrimary,
                            fontSize = 26.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 0.5.sp
                        )
                    }
                    error?.let { Text(it, color = DashitColors.Danger, fontSize = 13.sp) }
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(54.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(DashitColors.SurfaceRaised)
                                .border(1.dp, DashitColors.Hairline, RoundedCornerShape(16.dp))
                                .pressable(scale = 0.98f) {
                                    if (!isSigningIn) {
                                        HapticsManager.light(view)
                                        isConfirming = false
                                    }
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            Text("Edit", color = DashitColors.TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        }
                        Box(Modifier.weight(1.6f)) {
                            PrimaryButton("Yes, that's me", enabled = !isSigningIn, isBusy = isSigningIn) {
                                isSigningIn = true
                                error = null
                                scope.launch {
                                    try {
                                        val profile = AuthRepository.signInWithConfirmedMobile(digits)
                                        HapticsManager.success(view)
                                        onSignedIn(profile)
                                    } catch (e: Exception) {
                                        HapticsManager.error(view)
                                        error = e.message
                                    } finally {
                                        isSigningIn = false
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
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
