package com.dashit.app.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.DeleteForever
import androidx.compose.material.icons.filled.HeadsetMic
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Payment
import androidx.compose.material.icons.filled.Policy
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.model.UserProfile
import androidx.compose.runtime.rememberCoroutineScope
import com.dashit.app.data.auth.AuthRepository
import com.dashit.app.ui.auth.PhoneConfirmSheet
import com.dashit.app.ui.orders.IosActionSheet
import com.dashit.app.ui.orders.SheetAction
import kotlinx.coroutines.launch

@Composable
fun ProfileScreen(
    user: UserProfile?,
    onSignOut: () -> Unit = {}
) {
    val view = LocalView.current
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showPolicyDialog by remember { mutableStateOf(false) }
    var isSignInOpen by remember { mutableStateOf(false) }
    var isDeleting by remember { mutableStateOf(false) }
    var deleteError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val accountDeleted = user == null

    val cardShape = RoundedCornerShape(16.dp)
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DashitColors.Surface)
            .statusBarsPadding()
    ) {
        // Top Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Profile",
                color = DashitColors.TextPrimary,
                fontSize = 26.sp,
                fontWeight = FontWeight.Black
            )
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(DashitColors.Hairline)
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // User Header Card
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(cardShape)
                    .background(DashitColors.SurfaceRaised)
                    .border(1.dp, DashitColors.Hairline, cardShape)
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Initials Avatar
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(CircleShape)
                        .background(DashitColors.BrandOrange),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = user?.initials ?: "D",
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text(
                        text = user?.name?.takeIf { it.isNotBlank() } ?: if (user == null) "Guest" else "DASHit shopper",
                        color = DashitColors.TextPrimary,
                        fontSize = 19.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = user?.let { "+91 ${it.mobile}" } ?: "Confirm your number to order",
                        color = DashitColors.TextMuted,
                        fontSize = 13.5.sp
                    )
                    if (!user?.email.isNullOrEmpty()) {
                        Text(
                            text = user?.email ?: "",
                            color = DashitColors.TextMuted,
                            fontSize = 12.sp
                        )
                    }
                }
            }

            // Account Actions Card
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(cardShape)
                    .background(DashitColors.SurfaceRaised)
                    .border(1.dp, DashitColors.Hairline, cardShape)
            ) {
                ProfileOptionRow(
                    icon = Icons.Default.LocationOn,
                    title = "Delivery addresses",
                    subtitle = (user?.defaultAddress ?: com.dashit.app.data.model.DeliveryAddress()).displaySummary,
                    onClick = { HapticsManager.light(view) }
                )

                RowDivider()

                ProfileOptionRow(
                    icon = Icons.Default.Payment,
                    title = "Payment methods",
                    subtitle = "Cash on Delivery & UPI",
                    onClick = { HapticsManager.light(view) }
                )

                RowDivider()

                ProfileOptionRow(
                    icon = Icons.Default.Notifications,
                    title = "Notifications & Sounds",
                    onClick = { HapticsManager.light(view) }
                )

                RowDivider()

                ProfileOptionRow(
                    icon = Icons.Default.HeadsetMic,
                    title = "Customer Support (24x7)",
                    subtitle = "Chat with Anantnag dark store support",
                    onClick = { HapticsManager.light(view) }
                )
            }

            // Google Play Compliance Section
            Text(
                text = "Privacy & Legal",
                color = DashitColors.TextMuted,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(start = 4.dp, top = 4.dp)
            )

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(cardShape)
                    .background(DashitColors.SurfaceRaised)
                    .border(1.dp, DashitColors.Hairline, cardShape)
            ) {
                ProfileOptionRow(
                    icon = Icons.Default.Policy,
                    title = "Privacy Policy",
                    onClick = {
                        HapticsManager.light(view)
                        showPolicyDialog = true
                    }
                )

                RowDivider()

                ProfileOptionRow(
                    icon = Icons.Default.Lock,
                    title = "Terms of Service",
                    onClick = {
                        HapticsManager.light(view)
                        showPolicyDialog = true
                    }
                )

                RowDivider()

                // Google Play Account Deletion compliance row
                ProfileOptionRow(
                    icon = Icons.Default.DeleteForever,
                    title = "Delete Account & Data",
                    titleColor = DashitColors.Danger,
                    onClick = {
                        HapticsManager.warning(view)
                        showDeleteDialog = true
                    }
                )
            }

            // Sign Out Button
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .clip(cardShape)
                    .background(DashitColors.SurfaceRaised)
                    .border(1.dp, DashitColors.Hairline, cardShape)
                    .pressable(scale = 0.96f) {
                        HapticsManager.medium(view)
                        if (user == null) {
                            isSignInOpen = true
                        } else {
                            AuthRepository.signOut()
                            onSignOut()
                        }
                    },
                contentAlignment = Alignment.Center
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Logout,
                        contentDescription = null,
                        tint = DashitColors.TextSecondary,
                        modifier = Modifier.size(18.dp)
                    )
                    Text(
                        text = if (user == null) "Confirm your number" else "Sign Out",
                        color = DashitColors.TextSecondary,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            if (isDeleting) {
                Text("Deleting your account…", color = DashitColors.TextMuted, fontSize = 13.sp)
            }
            deleteError?.let { Text(it, color = DashitColors.Danger, fontSize = 13.sp) }

            Spacer(modifier = Modifier.height(130.dp))
        }
    }

    // Google Play account deletion: really deletes, confirmed in an iOS-style sheet.
    if (showDeleteDialog && user != null) {
        IosActionSheet(
            title = "Delete your account and data?",
            message = "This permanently deletes your DASHit account, saved addresses and profile. It can't be undone.",
            actions = listOf(
                SheetAction("Delete everything", isDestructive = true) {
                    showDeleteDialog = false
                    isDeleting = true
                    deleteError = null
                    scope.launch {
                        try {
                            AuthRepository.deleteAccount()
                            HapticsManager.success(view)
                        } catch (e: Exception) {
                            HapticsManager.error(view)
                            deleteError = "We couldn't delete your account right now. Check your connection and try again."
                        } finally {
                            isDeleting = false
                        }
                    }
                }
            ),
            cancelLabel = "Keep my account",
            onDismiss = { showDeleteDialog = false }
        )
    }

    if (isSignInOpen) {
        PhoneConfirmSheet(
            onSignedIn = { isSignInOpen = false },
            onDismiss = { isSignInOpen = false }
        )
    }

    // Privacy Policy Dialog
    if (showPolicyDialog) {
        AlertDialog(
            onDismissRequest = { showPolicyDialog = false },
            containerColor = DashitColors.SurfaceRaised,
            title = {
                Text(
                    text = "DASHit Privacy & Policy",
                    color = DashitColors.TextPrimary,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Text(
                    text = "DASHit respects your privacy. We collect phone number and delivery location exclusively to dispatch and deliver your grocery orders within 8 minutes from the dark store. Data is encrypted in transit and at rest.",
                    color = DashitColors.TextMuted,
                    fontSize = 13.5.sp,
                    lineHeight = 18.sp
                )
            },
            confirmButton = {
                TextButton(onClick = { showPolicyDialog = false }) {
                    Text(
                        text = "Done",
                        color = DashitColors.BrandOrange,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        )
    }
}

@Composable
private fun ProfileOptionRow(
    icon: ImageVector,
    title: String,
    subtitle: String? = null,
    titleColor: Color = DashitColors.TextPrimary,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = if (titleColor == DashitColors.Danger) DashitColors.Danger else DashitColors.BrandOrange,
            modifier = Modifier.size(20.dp)
        )

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                color = titleColor,
                fontSize = 14.5.sp,
                fontWeight = FontWeight.SemiBold
            )
            if (!subtitle.isNullOrEmpty()) {
                Text(
                    text = subtitle,
                    color = DashitColors.TextMuted,
                    fontSize = 12.sp
                )
            }
        }

        Icon(
            imageVector = Icons.Default.ChevronRight,
            contentDescription = null,
            tint = DashitColors.TextFaint,
            modifier = Modifier.size(18.dp)
        )
    }
}

@Composable
private fun RowDivider() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(1.dp)
            .padding(start = 50.dp)
            .background(DashitColors.Hairline)
    )
}
