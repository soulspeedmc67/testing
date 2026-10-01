package com.dashit.app.ui.address

import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.AddressBook
import com.dashit.app.data.CurrentLocation
import com.dashit.app.data.DeliveryEta
import com.dashit.app.data.model.DeliveryAddress
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

/**
 * The "Deliver to" menu that grows out of the header's address row, as on the
 * iPhone app: search for an address, select one on the map, or switch to a
 * saved one. [anchor] is the row's bounds in the window.
 */
@Composable
fun AddressMenuPopup(
    anchor: Rect?,
    onSearch: () -> Unit,
    onPickOnMap: () -> Unit,
    onDismiss: () -> Unit
) {
    val view = LocalView.current
    val scope = rememberCoroutineScope()
    val density = LocalDensity.current
    val saved by AddressBook.saved.collectAsState()
    val current by AddressBook.current.collectAsState()
    val progress = remember { Animatable(0f) }
    var isClosing by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        HapticsManager.light(view)
        progress.animateTo(1f, spring(dampingRatio = 0.82f, stiffness = 260f))
    }

    /** Shrinks back into the row; `then` runs straight away so the next screen can rise as it folds. */
    fun close(then: (() -> Unit)? = null) {
        if (isClosing) return
        isClosing = true
        then?.invoke()
        scope.launch {
            progress.animateTo(0f, spring(dampingRatio = 1f, stiffness = 700f))
            onDismiss()
        }
    }

    BackHandler { close() }

    BoxWithConstraints(Modifier.fillMaxSize()) {
        val margin = 16.dp
        val cardWidth = minOf(maxWidth - margin * 2, 400.dp)
        val topPx = anchor?.takeIf { it.bottom > 0 }?.bottom?.plus(with(density) { 8.dp.toPx() })
            ?: with(density) { 110.dp.toPx() }
        val pivotX = anchor?.let {
            ((it.left + with(density) { 8.dp.toPx() } - with(density) { margin.toPx() }) / with(density) { cardWidth.toPx() }).coerceIn(0f, 1f)
        } ?: 0.1f
        val p = progress.value

        Box(
            Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.45f * p.coerceIn(0f, 1f)))
                .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) { close() }
        )

        val shape = RoundedCornerShape(26.dp)
        Column(
            modifier = Modifier
                .offset { IntOffset(with(density) { margin.roundToPx() }, topPx.roundToInt()) }
                .width(cardWidth)
                .graphicsLayer {
                    val scale = 0.2f + 0.8f * p
                    scaleX = scale
                    scaleY = scale
                    alpha = p.coerceIn(0f, 1f)
                    transformOrigin = TransformOrigin(pivotX, 0f)
                }
                .shadow(24.dp, shape)
                .clip(shape)
                .background(DashitColors.SurfaceOverlay)
                .border(1.dp, Brush.verticalGradient(listOf(DashitColors.EdgeHighlight, DashitColors.Hairline)), shape)
                .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) { }
                .padding(bottom = 10.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 16.dp, end = 8.dp, top = 12.dp, bottom = 6.dp)
                    .stagger(0, p),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Deliver to", color = DashitColors.TextPrimary, fontSize = 19.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.weight(1f))
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .pressable(scale = 0.85f) { close() },
                    contentAlignment = Alignment.Center
                ) {
                    Box(Modifier.size(28.dp).clip(CircleShape).background(DashitColors.SurfaceMuted), contentAlignment = Alignment.Center) {
                        Icon(Icons.Filled.Close, contentDescription = "Close", tint = DashitColors.TextSecondary, modifier = Modifier.size(14.dp))
                    }
                }
            }

            Row(
                modifier = Modifier.padding(horizontal = 12.dp).stagger(1, p),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                ActionTile(Icons.Filled.Search, "Search address", "Type a street or landmark", Modifier.weight(1f)) {
                    close(then = onSearch)
                }
                ActionTile(Icons.Filled.Map, "Select on map", "Drop a pin at your door", Modifier.weight(1f)) {
                    close(then = onPickOnMap)
                }
            }

            Text(
                "SAVED ADDRESSES",
                color = DashitColors.TextMuted,
                fontSize = 11.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = 1.2.sp,
                modifier = Modifier.padding(start = 16.dp, top = 18.dp, bottom = 4.dp).stagger(2, p)
            )

            if (saved.isEmpty()) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp).stagger(3, p),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Filled.Bookmark, contentDescription = null, tint = DashitColors.TextFaint, modifier = Modifier.size(16.dp))
                    Text("Addresses you confirm are kept here for next time.", color = DashitColors.TextMuted, fontSize = 13.sp)
                }
            } else {
                Column(
                    modifier = Modifier
                        .heightIn(max = 66.dp * 4.5f)
                        .verticalScroll(rememberScrollState())
                ) {
                    saved.forEachIndexed { index, address ->
                        SavedRow(
                            address = address,
                            isCurrent = current?.let { AddressBook.isCurrent(address) } ?: false,
                            modifier = Modifier.stagger(3 + minOf(index, 6), p)
                        ) {
                            HapticsManager.success(view)
                            AddressBook.use(address)
                            close()
                        }
                    }
                }
            }
        }
    }
}

/** Rows settle in one after another as the menu opens. */
private fun Modifier.stagger(index: Int, progress: Float): Modifier = graphicsLayer {
    val local = ((progress - 0.08f * index) / (1f - 0.08f * index).coerceAtLeast(0.2f)).coerceIn(0f, 1f)
    alpha = local
    translationY = (1f - local) * 10.dp.toPx()
}

@Composable
private fun ActionTile(icon: ImageVector, title: String, subtitle: String, modifier: Modifier, onClick: () -> Unit) {
    val view = LocalView.current
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(18.dp))
            .background(DashitColors.SurfaceMuted)
            .pressable(scale = 0.95f) {
                HapticsManager.light(view)
                onClick()
            }
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Box(
            Modifier.size(36.dp).clip(CircleShape).background(DashitColors.BrandOrange.copy(alpha = 0.13f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = DashitColors.BrandAccent, modifier = Modifier.size(18.dp))
        }
        Column {
            Text(title, color = DashitColors.TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold, maxLines = 1)
            Text(subtitle, color = DashitColors.TextMuted, fontSize = 11.5.sp, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
private fun SavedRow(address: DeliveryAddress, isCurrent: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val quote = remember(address.latitude, address.longitude) { DeliveryEta.quote(address.latitude, address.longitude) }
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(66.dp)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(
            Modifier.size(38.dp).clip(CircleShape).background(if (isCurrent) DashitColors.BrandOrange else DashitColors.SurfaceMuted),
            contentAlignment = Alignment.Center
        ) {
            Icon(iconFor(address.nickname), contentDescription = null, tint = if (isCurrent) Color.White else DashitColors.TextSecondary, modifier = Modifier.size(17.dp))
        }
        Column(Modifier.weight(1f)) {
            Text(address.nickname.replaceFirstChar { it.uppercase() }, color = DashitColors.TextPrimary, fontSize = 14.5.sp, fontWeight = FontWeight.Bold, maxLines = 1)
            Text(address.doorLine.ifBlank { "Pinned location" }, color = DashitColors.TextSecondary, fontSize = 12.5.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                text = quote.etaMinutes?.let { "$it min · ${quote.shortDistanceText}" } ?: "Outside our delivery area",
                color = if (quote.isDeliverable) DashitColors.TextMuted else DashitColors.Danger,
                fontSize = 11.5.sp,
                fontWeight = FontWeight.Medium
            )
        }
        if (isCurrent) Icon(Icons.Filled.CheckCircle, contentDescription = "Current", tint = DashitColors.BrandAccent, modifier = Modifier.size(20.dp))
    }
}

internal fun iconFor(nickname: String): ImageVector = when (nickname.lowercase()) {
    "home" -> Icons.Filled.Home
    "work" -> Icons.Filled.Business
    else -> Icons.Filled.Place
}

private val POPULAR_AREAS = listOf(
    CurrentLocation.Place("Lal Chowk", "Court Road, Anantnag", 33.7311, 75.1487),
    CurrentLocation.Place("Khanabal", "KP Road, Anantnag", 33.7360, 75.1418),
    CurrentLocation.Place("Mattan Adda", "Anantnag", 33.7339, 75.1540),
    CurrentLocation.Place("Ashajipora", "Anantnag", 33.7224, 75.1405),
    CurrentLocation.Place("Dialgam", "Anantnag", 33.7006, 75.1338),
    CurrentLocation.Place("Janglat Mandi", "Anantnag", 33.7329, 75.1599),
    CurrentLocation.Place("Mehandi Kadal", "Anantnag", 33.7302, 75.1527),
    CurrentLocation.Place("Reshi Bazar", "Anantnag", 33.7353, 75.1563),
    CurrentLocation.Place("Sarnal", "Anantnag", 33.7224, 75.1546)
)

/**
 * Typing an address: the phone's place search around Anantnag, with the
 * town's main areas while nothing is typed. Picking a place opens the pin
 * picker there, to put the pin on the exact door.
 */
@Composable
fun AddressSearchScreen(
    onBack: () -> Unit,
    onUseMyLocation: () -> Unit,
    onPick: (CurrentLocation.Place) -> Unit
) {
    val context = LocalContext.current
    val view = LocalView.current
    var query by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<CurrentLocation.Place>>(emptyList()) }
    var isSearching by remember { mutableStateOf(false) }
    val focus = remember { FocusRequester() }

    BackHandler(onBack = onBack)
    LaunchedEffect(Unit) {
        delay(250)
        runCatching { focus.requestFocus() }
    }
    LaunchedEffect(query) {
        val q = query.trim()
        if (q.length < 2) {
            results = emptyList()
            isSearching = false
            return@LaunchedEffect
        }
        isSearching = true
        delay(300)
        val local = POPULAR_AREAS.filter { it.title.contains(q, true) || it.subtitle.contains(q, true) }
        results = (local + CurrentLocation.search(context, q)).distinctBy { it.title.lowercase() }
        isSearching = false
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DashitColors.Surface)
            .statusBarsPadding()
            .imePadding()
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Box(
                Modifier.size(42.dp).clip(CircleShape).pressable(scale = 0.9f) { onBack() },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = DashitColors.TextPrimary, modifier = Modifier.size(22.dp))
            }
            BasicTextField(
                value = query,
                onValueChange = { query = it.take(80) },
                singleLine = true,
                textStyle = TextStyle(color = DashitColors.TextPrimary, fontSize = 15.sp),
                cursorBrush = SolidColor(DashitColors.BrandOrange),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                modifier = Modifier.weight(1f).focusRequester(focus),
                decorationBox = { inner ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(46.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(DashitColors.SurfaceRaised)
                            .border(1.dp, DashitColors.Hairline, RoundedCornerShape(14.dp))
                            .padding(horizontal = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Filled.Search, contentDescription = null, tint = DashitColors.TextMuted, modifier = Modifier.size(19.dp))
                        Box(Modifier.weight(1f)) {
                            if (query.isEmpty()) Text("Search a street, area or landmark", color = DashitColors.TextFaint, fontSize = 15.sp, maxLines = 1)
                            inner()
                        }
                        if (query.isNotEmpty()) {
                            Icon(
                                Icons.Filled.Close, contentDescription = "Clear", tint = DashitColors.TextMuted,
                                modifier = Modifier.size(18.dp).clickable { query = "" }
                            )
                        }
                    }
                }
            )
        }

        LazyColumn(Modifier.fillMaxSize()) {
            item(key = "here") {
                PlaceRow(Icons.Filled.MyLocation, "Use my current location", "Find me on the map", accent = true) {
                    HapticsManager.light(view)
                    onUseMyLocation()
                }
            }
            val shown = if (query.trim().length < 2) POPULAR_AREAS else results
            item(key = "label") {
                Text(
                    text = when {
                        query.trim().length < 2 -> "AREAS WE DELIVER TO"
                        isSearching -> "SEARCHING…"
                        shown.isEmpty() -> "NO MATCHES — TRY ANOTHER NAME, OR PICK ON THE MAP"
                        else -> "RESULTS"
                    },
                    color = DashitColors.TextMuted,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.sp,
                    modifier = Modifier.padding(start = 20.dp, top = 14.dp, bottom = 6.dp)
                )
            }
            items(shown, key = { "${it.title}|${it.lat}" }) { place ->
                PlaceRow(Icons.Filled.Place, place.title, place.subtitle) {
                    HapticsManager.light(view)
                    onPick(place)
                }
            }
            item { Spacer(Modifier.height(40.dp)) }
        }
    }
}

@Composable
private fun PlaceRow(icon: ImageVector, title: String, subtitle: String, accent: Boolean = false, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Box(
            Modifier.size(36.dp).clip(CircleShape).background(if (accent) DashitColors.BrandOrange.copy(alpha = 0.13f) else DashitColors.SurfaceMuted),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = if (accent) DashitColors.BrandAccent else DashitColors.TextSecondary, modifier = Modifier.size(18.dp))
        }
        Column(Modifier.weight(1f)) {
            Text(title, color = if (accent) DashitColors.BrandAccent else DashitColors.TextPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
            Text(subtitle, color = DashitColors.TextMuted, fontSize = 12.5.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}
