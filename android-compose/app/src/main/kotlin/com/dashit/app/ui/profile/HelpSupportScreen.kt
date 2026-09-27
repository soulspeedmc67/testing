package com.dashit.app.ui.profile

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dashit.app.R
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable

/**
 * How to reach the store and the pages every screen links to. Same numbers
 * and addresses as the web footer, the Terms (`src/pages/terms.js`) and iOS.
 */
object SupportContact {
    const val PHONE = "+916006990032"
    const val PHONE_DISPLAY = "+91 60069 90032"
    const val EMAIL = "support@dashit.co.in"
    const val WHATSAPP_URL = "https://wa.me/916006990032?text=Hi%20DASHit%2C%20I%20need%20help%20with%20my%20order"
    const val PRIVACY_URL = "https://dashit.co.in/privacy/"
    const val TERMS_URL = "https://dashit.co.in/terms/"

    fun call(context: Context) = start(context, Intent(Intent.ACTION_DIAL, Uri.parse("tel:$PHONE")))

    fun email(context: Context) = start(
        context,
        Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:$EMAIL")).putExtra(Intent.EXTRA_SUBJECT, "DASHit app help")
    )

    private fun start(context: Context, intent: Intent) {
        try {
            context.startActivity(intent)
        } catch (e: ActivityNotFoundException) {
            // No dialer or mail app on this device; nothing to open.
        }
    }
}

private data class Question(val question: String, val answer: String)

/* Answers follow the app's real rules (5 km area, 30-second change window,
   delivery code, ₹25 fee under ₹299) and the Terms. */
private val QUESTIONS = listOf(
    Question(
        "Where do you deliver?",
        "Anywhere within 5 km of our store in Anantnag. Set your address at the top of the Home screen and we'll tell you straight away if we can reach you."
    ),
    Question(
        "How long will my order take?",
        "The time on the Home screen is worked out from how far you are from our store. It's an estimate, and it can be longer in heavy traffic, snow or bad weather."
    ),
    Question(
        "Can I change or cancel my order?",
        "For 30 seconds after you place it, you can add items or cancel from the order tracker. After that, call us: an order can still be cancelled until it leaves with the rider."
    ),
    Question(
        "What is the delivery code?",
        "Every order has a 4-digit code on its tracker. Share it with your rider at the door; they need it to hand the order over, so it only reaches you."
    ),
    Question(
        "Is there a delivery fee?",
        "Delivery is free on orders of ₹299 or more. Below that it's ₹25. There's no minimum order."
    ),
    Question(
        "Something is missing, damaged or wrong",
        "Tell us within 2 hours of delivery by call, WhatsApp or email, and we'll replace it or refund it."
    ),
    Question(
        "How do I delete my account?",
        "Open Profile and tap Delete account. Your profile, saved addresses and personal details are erased."
    )
)

/** Help & support: call, WhatsApp or email the store, and common questions. */
@Composable
fun HelpSupportScreen(onBack: () -> Unit) {
    val view = LocalView.current
    val context = LocalContext.current
    val uriHandler = LocalUriHandler.current
    var expanded by remember { mutableStateOf<Int?>(null) }

    BackHandler(onBack = onBack)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DashitColors.Surface)
            .statusBarsPadding()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .pressable(scale = 0.9f) {
                        HapticsManager.light(view)
                        onBack()
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = DashitColors.TextPrimary)
            }
            Text(
                "Help & support",
                color = DashitColors.TextPrimary,
                fontSize = 19.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(start = 6.dp)
            )
        }
        Box(Modifier.fillMaxWidth().height(1.dp).background(DashitColors.Hairline))

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .navigationBarsPadding()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            // Hero
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(DashitColors.Midnight)
                    .padding(start = 18.dp, end = 8.dp, top = 10.dp, bottom = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("How can we help?", color = Color.White, fontSize = 21.sp, fontWeight = FontWeight.ExtraBold)
                    Text(
                        "Our Anantnag team answers calls and messages while the store is open.",
                        color = Color.White.copy(alpha = 0.75f),
                        fontSize = 13.sp
                    )
                }
                Image(
                    painter = painterResource(R.drawable.auth_groceries),
                    contentDescription = null,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.size(width = 76.dp, height = 110.dp)
                )
            }

            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                ContactRow(Icons.Filled.Call, DashitColors.Positive, "Call us", SupportContact.PHONE_DISPLAY) {
                    HapticsManager.light(view)
                    SupportContact.call(context)
                }
                ContactRow(Icons.Filled.Send, Color(0xFF25D366), "Chat on WhatsApp", "Usually the quickest") {
                    HapticsManager.light(view)
                    uriHandler.openUri(SupportContact.WHATSAPP_URL)
                }
                ContactRow(Icons.Filled.Email, DashitColors.BrandOrange, "Email us", SupportContact.EMAIL) {
                    HapticsManager.light(view)
                    SupportContact.email(context)
                }
            }

            Text(
                "Common questions",
                color = DashitColors.TextPrimary,
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(start = 4.dp)
            )
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(DashitColors.SurfaceRaised)
                    .border(1.dp, DashitColors.Hairline, RoundedCornerShape(16.dp))
            ) {
                QUESTIONS.forEachIndexed { index, item ->
                    if (index > 0) Box(Modifier.fillMaxWidth().height(1.dp).background(DashitColors.Hairline))
                    val isOpen = expanded == index
                    val rotation by animateFloatAsState(if (isOpen) 180f else 0f, label = "faq_chevron")
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                HapticsManager.selection(view)
                                expanded = if (isOpen) null else index
                            }
                            .padding(14.dp)
                    ) {
                        Row(verticalAlignment = Alignment.Top) {
                            Text(
                                item.question,
                                color = DashitColors.TextPrimary,
                                fontSize = 14.5.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.weight(1f)
                            )
                            Icon(
                                Icons.Filled.KeyboardArrowDown,
                                contentDescription = null,
                                tint = DashitColors.TextFaint,
                                modifier = Modifier.size(20.dp).rotate(rotation)
                            )
                        }
                        AnimatedVisibility(
                            visible = isOpen,
                            enter = expandVertically() + fadeIn(),
                            exit = shrinkVertically() + fadeOut()
                        ) {
                            Text(
                                item.answer,
                                color = DashitColors.TextSecondary,
                                fontSize = 13.5.sp,
                                lineHeight = 19.sp,
                                modifier = Modifier.padding(top = 8.dp)
                            )
                        }
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center
            ) {
                Text(
                    "Privacy Policy",
                    color = DashitColors.TextMuted,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.pressable { uriHandler.openUri(SupportContact.PRIVACY_URL) }
                )
                Spacer(Modifier.size(20.dp))
                Text(
                    "Terms & Conditions",
                    color = DashitColors.TextMuted,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.pressable { uriHandler.openUri(SupportContact.TERMS_URL) }
                )
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun ContactRow(icon: ImageVector, tint: Color, title: String, subtitle: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(DashitColors.SurfaceRaised)
            .border(1.dp, DashitColors.Hairline, RoundedCornerShape(16.dp))
            .pressable(scale = 0.98f, onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(tint),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
        }
        Column(Modifier.weight(1f)) {
            Text(title, color = DashitColors.TextPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            Text(subtitle, color = DashitColors.TextMuted, fontSize = 13.sp)
        }
    }
}
