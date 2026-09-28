package com.dashit.app.ui.storefront

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.Badge
import androidx.compose.material.icons.outlined.WarningAmber
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.model.Product
import com.dashit.app.ui.components.QuantityStepper
import kotlinx.coroutines.launch

/**
 * The tobacco section, the same way the website does it (`src/lib/tobacco.js`)
 * and the way Blinkit sells cigarettes:
 *
 * - Tobacco never shows while browsing: not on the home feed, in categories,
 *   rails or ordinary search results. India's COTPA 2003 bars advertising it,
 *   and Google Play doesn't allow featuring it (no banners or categories).
 * - Searching for it shows a "Looking for tobacco products?" card. "View items"
 *   asks for the declaration (18+, not near a school or college, photo ID at the
 *   door), and only then does the list open.
 * - Packs are drawn as plain, unbranded boxes instead of brand photos.
 *
 * Google Play "may allow the limited sale of tobacco products in food/grocery
 * delivery apps … subject to age-gating safeguards (such as ID check at delivery)".
 */
object Tobacco {
    /** "v2" because it covers more than the old 18+ question. Same key as iOS. */
    private const val DECLARATION_KEY = "dashit_tobacco_declaration_v2"

    const val HEALTH_WARNING = "Tobacco causes cancer. Tobacco products are injurious to health."
    const val TERMS_URL = "https://dashit.co.in/terms/#tobacco"

    private val intentStems = listOf(
        "cig", "cugar", "sigar", "smoking", "tobac", "bidi", "beedi", "hookah", "shisha",
        "vape", "nicotin", "gutkha", "zarda", "khaini", "snuff", "rolling paper"
    )

    /** Whole words only, so "smoky chips" and "classic curd" stay groceries. */
    private val intentWords = listOf(
        "smoke", "smokes", "marlboro", "gold flake", "goldflake", "wills", "navy cut", "benson",
        "esse", "four square", "red and white", "capstan", "davidoff", "dunhill", "ice burst"
    )

    fun isQuery(query: String): Boolean {
        val q = query.trim().lowercase()
        if (q.length < 3) return false
        if (intentStems.any { q.contains(it) }) return true
        val padded = " " + q.split(Regex("\\s+")).joinToString(" ") + " "
        return intentWords.any { padded.contains(" $it ") }
    }

    /** Name matches first, then — when the search is plainly for tobacco — the rest. */
    fun matches(query: String, tobacco: List<Product>): List<Product> {
        val q = query.trim().lowercase()
        if (q.length < 3) return emptyList()
        val (direct, rest) = tobacco.partition { it.name.lowercase().contains(q) }
        return if (isQuery(q)) direct + rest else direct
    }

    fun showsCard(query: String, tobacco: List<Product>): Boolean =
        tobacco.isNotEmpty() && (isQuery(query) || matches(query, tobacco).isNotEmpty())

    fun isDeclared(context: Context): Boolean =
        context.getSharedPreferences("dashit_prefs", Context.MODE_PRIVATE).getBoolean(DECLARATION_KEY, false)

    fun declare(context: Context) {
        context.getSharedPreferences("dashit_prefs", Context.MODE_PRIVATE).edit().putBoolean(DECLARATION_KEY, true).apply()
    }
}

private data class Declaration(val isRule: Boolean, val text: String)

private val declarations = listOf(
    Declaration(true, "You are 18 or older (or the higher legal age in your area) and not buying tobacco on behalf of anyone underage."),
    Declaration(true, "Your delivery location is not in or around a school or college premises."),
    Declaration(false, "You will show a government photo ID at the door. Our rider cannot hand over tobacco without age proof.")
)

/** "Please make sure…": the declaration before any tobacco is listed. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TobaccoDeclarationSheet(onConfirm: () -> Unit, onDismiss: () -> Unit) {
    val view = LocalView.current
    val context = LocalContext.current
    val state = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = state,
        containerColor = DashitColors.SurfaceOverlay,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth().navigationBarsPadding().padding(bottom = 8.dp)) {
            Text(
                text = "Please make sure…",
                color = DashitColors.TextPrimary,
                fontSize = 22.sp,
                fontWeight = FontWeight.ExtraBold,
                modifier = Modifier.padding(horizontal = 20.dp).padding(bottom = 16.dp)
            )
            Spacer(Modifier.fillMaxWidth().height(1.dp).background(DashitColors.Hairline))

            Column(
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.padding(horizontal = 20.dp).padding(top = 20.dp)
            ) {
                declarations.forEach { item ->
                    Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier.size(38.dp).clip(CircleShape).background(DashitColors.SurfaceMuted)
                        ) {
                            Icon(
                                imageVector = if (item.isRule) Icons.Filled.Block else Icons.Outlined.Badge,
                                contentDescription = null,
                                tint = if (item.isRule) DashitColors.Danger else DashitColors.TextSecondary,
                                modifier = Modifier.size(19.dp)
                            )
                        }
                        Text(
                            text = item.text,
                            color = DashitColors.TextSecondary,
                            fontSize = 14.sp,
                            lineHeight = 19.sp,
                            modifier = Modifier.padding(top = 2.dp)
                        )
                    }
                }
            }

            Text(
                text = "Orders that break these rules are cancelled, and we are bound to report the account.",
                color = DashitColors.TextMuted,
                fontSize = 12.5.sp,
                lineHeight = 17.sp,
                modifier = Modifier.padding(horizontal = 20.dp).padding(top = 20.dp)
            )
            Text(
                text = "Read terms and conditions",
                color = DashitColors.BrandAccent,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                textDecoration = TextDecoration.Underline,
                modifier = Modifier
                    .padding(horizontal = 20.dp)
                    .pressable {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(Tobacco.TERMS_URL)))
                    }
                    .padding(vertical = 10.dp)
            )

            Text(
                text = "Yes, I confirm",
                color = Color.White,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .padding(horizontal = 20.dp)
                    .padding(top = 14.dp)
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(DashitColors.BrandOrange)
                    .pressable(scale = 0.98f) {
                        HapticsManager.medium(view)
                        Tobacco.declare(context)
                        scope.launch { state.hide() }.invokeOnCompletion { onConfirm() }
                    }
                    .padding(vertical = 15.dp),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
            Text(
                text = "Cancel",
                color = DashitColors.TextMuted,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .pressable {
                        HapticsManager.light(view)
                        scope.launch { state.hide() }.invokeOnCompletion { onDismiss() }
                    }
                    .padding(vertical = 13.dp)
            )
        }
    }
}

/** The tobacco list: the health warning, then each item as a plain pack. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TobaccoSectionSheet(
    products: List<Product>,
    quantityOf: (Product) -> Int,
    onAdd: (Product) -> Unit,
    onDecrement: (Product) -> Unit,
    onDismiss: () -> Unit
) {
    val state = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = state,
        containerColor = DashitColors.Surface,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth().fillMaxHeight(0.92f)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth().padding(start = 20.dp, end = 12.dp)
            ) {
                Text(
                    text = "Tobacco",
                    color = DashitColors.TextPrimary,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold,
                    modifier = Modifier.weight(1f)
                )
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(44.dp)
                        .pressable(scale = 0.85f) { scope.launch { state.hide() }.invokeOnCompletion { onDismiss() } }
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier.size(30.dp).clip(CircleShape).background(DashitColors.SurfaceMuted)
                    ) {
                        Icon(Icons.Filled.Close, contentDescription = "Close", tint = DashitColors.TextSecondary, modifier = Modifier.size(16.dp))
                    }
                }
            }
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(horizontal = 20.dp).padding(top = 4.dp, bottom = 14.dp)
            ) {
                Icon(Icons.Outlined.WarningAmber, contentDescription = null, tint = DashitColors.Danger, modifier = Modifier.size(16.dp))
                Text(Tobacco.HEALTH_WARNING, color = DashitColors.TextSecondary, fontSize = 12.5.sp, fontWeight = FontWeight.Medium)
            }
            Spacer(Modifier.fillMaxWidth().height(1.dp).background(DashitColors.Hairline))

            if (products.isEmpty()) {
                Box(Modifier.fillMaxWidth().padding(top = 60.dp), contentAlignment = Alignment.Center) {
                    Text("Nothing here right now.", color = DashitColors.TextMuted, fontSize = 14.sp)
                }
            } else {
                LazyColumn(modifier = Modifier.fillMaxWidth().navigationBarsPadding()) {
                    items(products, key = { it.id }) { product ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(14.dp),
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp)
                        ) {
                            PlainPackArt(
                                modifier = Modifier
                                    .size(56.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .border(1.dp, DashitColors.Hairline, RoundedCornerShape(12.dp))
                            )
                            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                Text(product.name, color = DashitColors.TextPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                Text(product.unit, color = DashitColors.TextMuted, fontSize = 12.5.sp)
                                Text(product.displayPrice, color = DashitColors.TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            }
                            QuantityStepper(
                                quantity = quantityOf(product),
                                isEnabled = product.isAvailable,
                                onAdd = { onAdd(product) },
                                onIncrement = { onAdd(product) },
                                onDecrement = { onDecrement(product) }
                            )
                        }
                        Spacer(Modifier.padding(start = 90.dp).fillMaxWidth().height(1.dp).background(DashitColors.HairlineSoft))
                    }
                }
            }
        }
    }
}

/** Under a tobacco search: where the items are, and the health caution. */
@Composable
fun TobaccoSearchCard(onView: () -> Unit, modifier: Modifier = Modifier) {
    val view = LocalView.current
    val shape = RoundedCornerShape(18.dp)
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        modifier = modifier
            .fillMaxWidth()
            .clip(shape)
            .background(DashitColors.SurfaceRaised)
            .border(1.dp, DashitColors.Hairline, shape)
            .padding(14.dp)
    ) {
        PlainPackArt(modifier = Modifier.size(52.dp).clip(RoundedCornerShape(12.dp)))
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text("Looking for tobacco products?", color = DashitColors.TextPrimary, fontSize = 15.sp, fontWeight = FontWeight.Bold)
            Text("Caution: Tobacco products are injurious to health", color = DashitColors.TextMuted, fontSize = 12.sp, lineHeight = 16.sp)
        }
        Text(
            text = "View items",
            color = Color.White,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            modifier = Modifier
                .clip(CircleShape)
                .background(DashitColors.BrandOrange)
                .pressable {
                    HapticsManager.light(view)
                    onView()
                }
                .padding(horizontal = 14.dp, vertical = 9.dp)
        )
    }
}

/** A plain, unbranded cigarette pack (the website's `tobacco-plain-pack.svg`). */
@Composable
fun PlainPackArt(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        val s = size.minDimension / 400f
        translate(left = (size.width - 400f * s) / 2f, top = (size.height - 400f * s) / 2f) {
            scale(scale = s, pivot = Offset.Zero) {
                drawRect(Color(0xFFF1EEEA), size = Size(400f, 400f))
                drawOval(Color.Black.copy(alpha = 0.08f), topLeft = Offset(111f, 321f), size = Size(184f, 18f))
                drawPath(Path().apply {
                    moveTo(262f, 100f); lineTo(284f, 88f); lineTo(284f, 308f); lineTo(262f, 320f); close()
                }, Color(0xFFCFCFD6))
                drawPath(Path().apply {
                    moveTo(122f, 100f); lineTo(144f, 88f); lineTo(284f, 88f); lineTo(262f, 100f); close()
                }, Color(0xFFF8F8FA))
                drawRoundRect(Color.White, topLeft = Offset(122f, 100f), size = Size(140f, 220f), cornerRadius = CornerRadius(4f))
                drawRoundRect(Color(0xFFE1E1E6), topLeft = Offset(122f, 100f), size = Size(140f, 220f), cornerRadius = CornerRadius(4f), style = Stroke(1.5f))
                drawLine(Color(0xFFDADADF), Offset(122f, 152f), Offset(262f, 152f), strokeWidth = 2f)
                drawRoundRect(Color(0xFFF3F3F5), topLeft = Offset(150f, 204f), size = Size(84f, 40f), cornerRadius = CornerRadius(4f))
                drawRoundRect(Color(0xFFE3E3E8), topLeft = Offset(150f, 204f), size = Size(84f, 40f), cornerRadius = CornerRadius(4f), style = Stroke(1.5f))
                drawRoundRect(Color(0xFFC8C8CE), topLeft = Offset(162f, 216f), size = Size(60f, 5f), cornerRadius = CornerRadius(2.5f))
                drawRoundRect(Color(0xFFD7D7DC), topLeft = Offset(170f, 228f), size = Size(44f, 4f), cornerRadius = CornerRadius(2f))
            }
        }
    }
}
