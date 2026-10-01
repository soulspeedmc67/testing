package com.dashit.app.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dashit.app.core.design.DashitColors

const val OTP_LENGTH = 6

/**
 * The six-digit code from the text message: six boxes over one hidden field,
 * so the number pad, paste and the phone's "fill code" suggestion all work.
 * [onComplete] fires when the sixth digit is in.
 */
@Composable
fun OtpCodeField(
    code: String,
    onCodeChange: (String) -> Unit,
    onComplete: (String) -> Unit,
    boxColor: Color = DashitColors.Surface,
    enabled: Boolean = true
) {
    val focus = remember { FocusRequester() }
    LaunchedEffect(Unit) { runCatching { focus.requestFocus() } }

    Box(modifier = Modifier.fillMaxWidth().height(56.dp)) {
        BasicTextField(
            value = code,
            onValueChange = { value ->
                val digits = value.filter { it.isDigit() }.take(OTP_LENGTH)
                onCodeChange(digits)
                if (digits.length == OTP_LENGTH) onComplete(digits)
            },
            enabled = enabled,
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            textStyle = TextStyle(color = Color.Transparent, fontSize = 1.sp),
            cursorBrush = SolidColor(Color.Transparent),
            modifier = Modifier.fillMaxWidth().height(56.dp).alpha(0.01f).focusRequester(focus)
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            repeat(OTP_LENGTH) { index ->
                val isCurrent = index == code.length
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(boxColor)
                        .border(
                            1.dp,
                            if (isCurrent) DashitColors.BrandOrange else DashitColors.HairlineStrong,
                            RoundedCornerShape(12.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = code.getOrNull(index)?.toString() ?: "",
                        color = DashitColors.TextPrimary,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

/** Seconds until [resendAtMillis], counting down once a second (0 once it has passed). */
@Composable
fun rememberSecondsUntil(resendAtMillis: Long): Int {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(resendAtMillis) {
        while (System.currentTimeMillis() < resendAtMillis) {
            now = System.currentTimeMillis()
            kotlinx.coroutines.delay(1000)
        }
        now = System.currentTimeMillis()
    }
    return ((resendAtMillis - now + 999) / 1000).toInt().coerceAtLeast(0)
}

/**
 * The "enter the code" step's body: where the code was sent, the six boxes,
 * and links to ask again or change the number. The screen adds its own Verify button.
 */
@Composable
fun OtpEntry(
    mobile: String,
    code: String,
    onCodeChange: (String) -> Unit,
    onComplete: (String) -> Unit,
    resendAtMillis: Long,
    onResend: () -> Unit,
    onChangeNumber: () -> Unit,
    enabled: Boolean,
    boxColor: Color = DashitColors.Surface
) {
    val secondsLeft = rememberSecondsUntil(resendAtMillis)
    androidx.compose.foundation.layout.Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            "We sent a code to +91 $mobile.",
            color = DashitColors.TextSecondary,
            fontSize = 14.sp,
            lineHeight = 20.sp
        )
        OtpCodeField(code, onCodeChange, onComplete, boxColor, enabled)
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(
                text = if (secondsLeft > 0) "Send again in ${secondsLeft}s" else "Send again",
                color = if (secondsLeft > 0) DashitColors.TextMuted else DashitColors.BrandOrange,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .then(if (secondsLeft == 0 && enabled) Modifier.clickable { onResend() } else Modifier)
                    .padding(vertical = 8.dp)
            )
            Text(
                text = "Change number",
                color = DashitColors.TextSecondary,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .clickable { onChangeNumber() }
                    .padding(vertical = 8.dp)
            )
        }
    }
}
