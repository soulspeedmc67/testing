package com.dashit.app.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.pressable
import kotlinx.coroutines.delay

/** Digits in a sign-in code, as the sign-in server sends them. */
const val SIGN_IN_CODE_LENGTH = 6

/** "+91 98765 43210" */
fun formattedMobile(digits: String) = "+91 ${digits.take(5)} ${digits.drop(5)}"

/**
 * The code step of number sign-in, shared by the sign-in screen and the
 * sign-in sheet: where the code went, six boxes for it, and Resend once the
 * server's wait is over. [onComplete] fires as the sixth digit goes in, so the
 * shopper never has to reach for a button; hosts clear [code] when it's
 * refused, ready for another try. [boxColor] matches the host's fields.
 */
@Composable
fun SignInCodeStep(
    mobile: String,
    code: String,
    onCodeChange: (String) -> Unit,
    onComplete: (String) -> Unit,
    resendAtMillis: Long,
    onResend: () -> Unit,
    onChangeNumber: (() -> Unit)?,
    enabled: Boolean,
    boxColor: Color
) {
    val focus = remember { FocusRequester() }
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text(
            text = buildAnnotatedString {
                append("Enter the 6-digit code we sent on WhatsApp to ")
                withStyle(SpanStyle(color = DashitColors.TextPrimary, fontWeight = FontWeight.Bold)) {
                    append(formattedMobile(mobile))
                }
                append(".")
            },
            color = DashitColors.TextSecondary,
            fontSize = 15.sp,
            lineHeight = 21.sp
        )

        BasicTextField(
            value = code,
            onValueChange = { value ->
                val digits = value.filter { it.isDigit() }.take(SIGN_IN_CODE_LENGTH)
                if (digits == code) return@BasicTextField
                onCodeChange(digits)
                if (digits.length == SIGN_IN_CODE_LENGTH) onComplete(digits)
            },
            // Read-only rather than disabled while a code is checked, so the
            // keyboard stays up for another try.
            readOnly = !enabled,
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            cursorBrush = SolidColor(Color.Transparent),
            modifier = Modifier
                .fillMaxWidth()
                .focusRequester(focus)
                .semantics { contentDescription = "6-digit code" },
            decorationBox = {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    repeat(SIGN_IN_CODE_LENGTH) { index ->
                        val isNext = index == code.length && enabled
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(56.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(boxColor)
                                .border(
                                    if (isNext) 1.5.dp else 1.dp,
                                    if (isNext) DashitColors.BrandOrange else DashitColors.HairlineStrong,
                                    RoundedCornerShape(12.dp)
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                code.getOrNull(index)?.toString().orEmpty(),
                                color = DashitColors.TextPrimary,
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        )
        LaunchedEffect(Unit) { runCatching { focus.requestFocus() } }

        Row(verticalAlignment = Alignment.CenterVertically) {
            if (onChangeNumber != null) {
                Text(
                    "Change number",
                    color = DashitColors.TextSecondary,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier
                        .pressable { if (enabled) onChangeNumber() }
                        .padding(vertical = 8.dp)
                )
            }
            Box(Modifier.weight(1f))
            ResendCode(resendAtMillis = resendAtMillis, enabled = enabled, onResend = onResend)
        }
    }
}

/** "Resend code in 0:24", then a tappable "Resend code". */
@Composable
private fun ResendCode(resendAtMillis: Long, enabled: Boolean, onResend: () -> Unit) {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(resendAtMillis) {
        now = System.currentTimeMillis()
        while (now < resendAtMillis) {
            delay(1_000)
            now = System.currentTimeMillis()
        }
    }
    val secondsLeft = ((resendAtMillis - now + 999) / 1_000).coerceAtLeast(0)
    if (secondsLeft > 0) {
        Text(
            "Resend code in ${secondsLeft / 60}:${(secondsLeft % 60).toString().padStart(2, '0')}",
            color = DashitColors.TextMuted,
            fontSize = 14.sp,
            modifier = Modifier.padding(vertical = 8.dp)
        )
    } else {
        Text(
            "Resend code",
            color = DashitColors.BrandOrange,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier
                .pressable { if (enabled) onResend() }
                .padding(vertical = 8.dp)
        )
    }
}
