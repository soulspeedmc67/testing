package com.dashit.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.font.FontWeight
import com.dashit.app.core.design.DashitColors
import com.dashit.app.data.DelayNotice

/**
 * "Orders may be delayed" with the admin's reason, shown on the home screen and
 * at checkout while the notice is on ([DelayNotice]).
 */
@Composable
fun DelayNoticeBanner(notice: DelayNotice, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(14.dp)
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = shape,
        color = DashitColors.Caution.copy(alpha = 0.10f),
        border = BorderStroke(1.dp, DashitColors.Caution.copy(alpha = 0.35f))
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.Top
        ) {
            Icon(
                imageVector = Icons.Default.Schedule,
                contentDescription = null,
                tint = DashitColors.Caution,
                modifier = Modifier.size(18.dp)
            )
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(notice.title, color = DashitColors.TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Text(notice.message, color = DashitColors.TextMuted, fontSize = 12.sp, lineHeight = 16.sp)
            }
        }
    }
}
