package com.dashit.app.ui.profile

import androidx.compose.foundation.Image
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Feedback
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.PrivacyTip
import androidx.compose.material.icons.filled.SupportAgent
import androidx.compose.material.icons.filled.OpenInNew
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dashit.app.R
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.auth.AuthRepository
import com.dashit.app.data.model.UserProfile
import com.dashit.app.ui.auth.AuthMode
import com.dashit.app.ui.auth.AuthScreen
import com.dashit.app.ui.auth.PhoneSignInSheet
import com.dashit.app.ui.orders.IosActionSheet
import com.dashit.app.ui.orders.SheetAction
import kotlinx.coroutines.launch

/**
 * Account, help and legal in one place; every row does something. Signed
 * out, it invites the shopper to log in or sign up and still offers help and
 * the policies. Same sections as the iOS ProfileView.
 */
@Composable
fun ProfileScreen(
    user: UserProfile?,
    addressSummary: String? = null,
    onOpenAddress: () -> Unit = {},
    onSignOut: () -> Unit = {}
) {
    val view = LocalView.current
    val context = LocalContext.current
    val uriHandler = LocalUriHandler.current
    val scope = rememberCoroutineScope()

    var showDeleteDialog by remember { mutableStateOf(false) }
    var showSignOutDialog by remember { mutableStateOf(false) }
    // Deleting needs a fresh code to the account's number first.
    var isConfirmingDelete by remember { mutableStateOf(false) }
    var isHelpOpen by remember { mutableStateOf(false) }
    var authMode by remember { mutableStateOf<AuthMode?>(null) }
    var isDeleting by remember { mutableStateOf(false) }
    var deleteError by remember { mutableStateOf<String?>(null) }

    val versionName = remember {
        runCatching { context.packageManager.getPackageInfo(context.packageName, 0).versionName }.getOrNull() ?: ""
    }

    if (isHelpOpen) {
        HelpSupportScreen(onBack = { isHelpOpen = false })
        return
    }

    Box(Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(DashitColors.Surface)
                .statusBarsPadding()
        ) {
            Text(
                text = "Profile",
                color = DashitColors.TextPrimary,
                fontSize = 26.sp,
                fontWeight = FontWeight.Black,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 14.dp)
            )
            Box(Modifier.fillMaxWidth().height(1.dp).background(DashitColors.Hairline))

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                if (user != null) {
                    AccountHeader(user)
                    Section("Account") {
                        OptionRow(Icons.Filled.LocationOn, "Delivery address", subtitle = addressSummary) {
                            HapticsManager.light(view)
                            onOpenAddress()
                        }
                    }
                } else {
                    SignedOutCard(
                        onLogIn = {
                            HapticsManager.light(view)
                            authMode = AuthMode.LogIn
                        },
                        onSignUp = {
                            HapticsManager.light(view)
                            authMode = AuthMode.SignUp
                        }
                    )
                }

                Section("Help") {
                    OptionRow(Icons.Filled.SupportAgent, "Help & support", subtitle = "Questions, WhatsApp and email") {
                        HapticsManager.light(view)
                        isHelpOpen = true
                    }
                }

                Section("Legal") {
                    OptionRow(Icons.Filled.PrivacyTip, "Privacy Policy", external = true) {
                        HapticsManager.light(view)
                        uriHandler.openUri(SupportContact.PRIVACY_URL)
                    }
                    RowDivider()
                    OptionRow(Icons.Filled.Description, "Terms & Conditions", external = true) {
                        HapticsManager.light(view)
                        uriHandler.openUri(SupportContact.TERMS_URL)
                    }
                    RowDivider()
                    OptionRow(Icons.Filled.Feedback, "Complaints & Copyright", external = true) {
                        HapticsManager.light(view)
                        uriHandler.openUri(SupportContact.COMPLAINTS_URL)
                    }
                }

                if (user != null) {
                    // Sign out asks first.
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(DashitColors.SurfaceRaised)
                            .border(1.dp, DashitColors.Hairline, RoundedCornerShape(14.dp))
                            .pressable(scale = 0.97f) {
                                HapticsManager.light(view)
                                showSignOutDialog = true
                            },
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, tint = DashitColors.Danger, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.size(8.dp))
                        Text("Sign out", color = DashitColors.Danger, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    }

                    Text(
                        text = if (isDeleting) "Deleting your account…" else "Delete account",
                        color = DashitColors.TextMuted,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        textDecoration = TextDecoration.Underline,
                        modifier = Modifier
                            .align(Alignment.CenterHorizontally)
                            .clickable(enabled = !isDeleting) {
                                HapticsManager.warning(view)
                                showDeleteDialog = true
                            }
                            .padding(8.dp)
                    )
                    deleteError?.let { Text(it, color = DashitColors.Danger, fontSize = 13.sp) }
                }

                Text(
                    text = "DASHit ${versionName.orEmpty()} · Anantnag",
                    color = DashitColors.TextFaint,
                    fontSize = 12.sp,
                    modifier = Modifier.align(Alignment.CenterHorizontally)
                )

                Spacer(modifier = Modifier.height(130.dp))
            }
        }

        authMode?.let { mode ->
            AuthScreen(initialMode = mode, onClose = { authMode = null })
        }
    }

    if (showSignOutDialog && user != null) {
        IosActionSheet(
            title = "Sign out of DASHit?",
            message = "You'll need to log in again to order and to see your orders.",
            actions = listOf(
                SheetAction("Sign out", isDestructive = true) {
                    showSignOutDialog = false
                    AuthRepository.signOut()
                    onSignOut()
                }
            ),
            cancelLabel = "Cancel",
            onDismiss = { showSignOutDialog = false }
        )
    }

    // Google Play account deletion: really deletes, confirmed in an iOS-style sheet.
    if (showDeleteDialog && user != null) {
        IosActionSheet(
            title = "Delete your account and data?",
            message = "This permanently deletes your DASHit account, saved addresses and profile. It can't be undone.",
            actions = listOf(
                SheetAction("Delete everything", isDestructive = true) {
                    showDeleteDialog = false
                    deleteError = null
                    isConfirmingDelete = true
                }
            ),
            cancelLabel = "Keep my account",
            onDismiss = { showDeleteDialog = false }
        )
    }

    // The number is the account, so it can't be changed here: another number
    // is another account. Deleting asks for a code to the account's number.
    if (isConfirmingDelete && user != null) {
        PhoneSignInSheet(
            confirmMobile = user.mobile,
            onSignedIn = {
                isConfirmingDelete = false
                isDeleting = true
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
            },
            onDismiss = { isConfirmingDelete = false }
        )
    }
}

@Composable
private fun AccountHeader(user: UserProfile) {
    val shape = RoundedCornerShape(16.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(DashitColors.SurfaceRaised)
            .border(1.dp, DashitColors.Hairline, shape)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Box(
            modifier = Modifier.size(56.dp).clip(CircleShape).background(DashitColors.BrandOrange),
            contentAlignment = Alignment.Center
        ) {
            Text(user.initials, color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        }
        Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(
                text = user.name?.takeIf { it.isNotBlank() } ?: "DASHit shopper",
                color = DashitColors.TextPrimary,
                fontSize = 19.sp,
                fontWeight = FontWeight.Bold
            )
            Text("+91 ${user.mobile}", color = DashitColors.TextMuted, fontSize = 13.5.sp)
            if (!user.email.isNullOrEmpty()) {
                Text(user.email.orEmpty(), color = DashitColors.TextMuted, fontSize = 12.sp)
            }
        }
    }
}

/** Signed out: the scooter rider and separate Log in / Sign up buttons. */
@Composable
private fun SignedOutCard(onLogIn: () -> Unit, onSignUp: () -> Unit) {
    val shape = RoundedCornerShape(22.dp)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Brush.linearGradient(listOf(Color(0xFFFF6A1A), Color(0xFFD63800))))
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Row(verticalAlignment = Alignment.Bottom) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Welcome to DASHit", color = Color.White, fontSize = 21.sp, fontWeight = FontWeight.ExtraBold)
                Text(
                    "Log in to order, track deliveries live and reorder in one tap.",
                    color = Color.White.copy(alpha = 0.85f),
                    fontSize = 13.5.sp
                )
            }
            Image(
                painter = painterResource(R.drawable.auth_scooter),
                contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Modifier.size(100.dp)
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(46.dp)
                    .clip(RoundedCornerShape(13.dp))
                    .background(Color.White)
                    .pressable(scale = 0.97f, onClick = onLogIn),
                contentAlignment = Alignment.Center
            ) {
                Text("Log in", color = DashitColors.BrandOrange, fontSize = 15.sp, fontWeight = FontWeight.Bold)
            }
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(46.dp)
                    .clip(RoundedCornerShape(13.dp))
                    .background(Color.White.copy(alpha = 0.18f))
                    .border(1.dp, Color.White.copy(alpha = 0.45f), RoundedCornerShape(13.dp))
                    .pressable(scale = 0.97f, onClick = onSignUp),
                contentAlignment = Alignment.Center
            ) {
                Text("Sign up", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun Section(title: String, content: @Composable () -> Unit) {
    val shape = RoundedCornerShape(16.dp)
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = title.uppercase(),
            color = DashitColors.TextMuted,
            fontSize = 11.5.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.8.sp,
            modifier = Modifier.padding(start = 4.dp)
        )
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(shape)
                .background(DashitColors.SurfaceRaised)
                .border(1.dp, DashitColors.Hairline, shape)
        ) {
            content()
        }
    }
}

@Composable
private fun OptionRow(
    icon: ImageVector,
    title: String,
    subtitle: String? = null,
    detail: String? = null,
    external: Boolean = false,
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
        Icon(icon, contentDescription = null, tint = DashitColors.BrandOrange, modifier = Modifier.size(20.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(title, color = DashitColors.TextPrimary, fontSize = 14.5.sp, fontWeight = FontWeight.SemiBold)
            if (!subtitle.isNullOrEmpty()) {
                Text(subtitle, color = DashitColors.TextMuted, fontSize = 12.sp, maxLines = 1)
            }
        }
        if (!detail.isNullOrEmpty()) {
            Text(detail, color = DashitColors.TextMuted, fontSize = 13.sp, maxLines = 1)
        }
        Icon(
            imageVector = if (external) Icons.Filled.OpenInNew else Icons.Filled.ChevronRight,
            contentDescription = null,
            tint = DashitColors.TextFaint,
            modifier = Modifier.size(if (external) 16.dp else 18.dp)
        )
    }
}

@Composable
private fun RowDivider() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 50.dp)
            .height(1.dp)
            .background(DashitColors.Hairline)
    )
}
