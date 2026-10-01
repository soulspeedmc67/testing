package com.dashit.app.ui.address

import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.drawable.BitmapDrawable
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Place
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.AddressBook
import com.dashit.app.data.CurrentLocation
import com.dashit.app.data.DeliveryEta
import com.dashit.app.data.StoreStatus
import com.dashit.app.data.model.DeliveryAddress
import com.dashit.app.ui.map.MapStyle
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.osmdroid.events.MapListener
import org.osmdroid.events.ScrollEvent
import org.osmdroid.events.ZoomEvent
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker

/** Where the pin picker opens. */
data class PinStart(
    val lat: Double? = null,
    val lng: Double? = null,
    val line: String? = null,
    /** Moves the map to the phone's location as it opens. */
    val locateOnOpen: Boolean = false,
    /** A fresh address (search or "add new"), not an edit of the current one. */
    val isNew: Boolean = false
)

/**
 * Full-screen drop-a-pin picker, as on the iPhone app: the pin stays in the
 * middle and the map moves under it; when it settles the spot is named and
 * checked against the delivery area. House, landmark and Home / Work / Other
 * go with it, and Confirm makes it the delivery address.
 */
@Composable
fun AddressPinPicker(
    start: PinStart,
    onBack: () -> Unit,
    onSaved: (DeliveryAddress) -> Unit
) {
    val context = LocalContext.current
    val view = LocalView.current
    val scope = rememberCoroutineScope()
    val isDark = DashitColors.isDark

    val existing = remember { if (start.isNew) null else AddressBook.current.value }
    val origin = remember {
        GeoPoint(
            start.lat ?: existing?.latitude ?: DeliveryEta.HUB_LAT,
            start.lng ?: existing?.longitude ?: DeliveryEta.HUB_LNG
        )
    }
    var pin by remember { mutableStateOf(origin) }
    var isMoving by remember { mutableStateOf(false) }
    var isResolving by remember { mutableStateOf(false) }
    var isLocating by remember { mutableStateOf(false) }
    var locationDenied by remember { mutableStateOf(false) }
    var addressLine by remember { mutableStateOf(start.line ?: existing?.street.orEmpty()) }
    var house by remember { mutableStateOf(existing?.houseNumber.orEmpty()) }
    var landmark by remember { mutableStateOf(existing?.landmark.orEmpty()) }
    val hasHome = remember { AddressBook.saved.value.any { it.nickname.equals("Home", true) } }
    var nickname by remember {
        mutableStateOf(
            existing?.nickname?.let { n -> listOf("Home", "Work", "Other").firstOrNull { it.equals(n, true) } ?: "Other" }
                ?: if (start.isNew && hasHome) "Other" else "Home"
        )
    }
    var map by remember { mutableStateOf<MapView?>(null) }
    var meMarker by remember { mutableStateOf<Marker?>(null) }

    val quote = remember(pin) { DeliveryEta.quote(pin.latitude, pin.longitude) }
    val canSave = quote.isDeliverable && !isMoving && !isResolving

    BackHandler(onBack = onBack)

    var resolveJob by remember { mutableStateOf<Job?>(null) }
    fun resolve(point: GeoPoint) {
        resolveJob?.cancel()
        isResolving = true
        resolveJob = scope.launch {
            delay(250)
            addressLine = CurrentLocation.streetLine(context, point.latitude, point.longitude) ?: "Pinned location"
            isResolving = false
        }
    }

    fun locate() {
        if (!CurrentLocation.isAllowed(context)) return
        isLocating = true
        scope.launch {
            val fix = CurrentLocation.fix(context)
            isLocating = false
            if (fix == null) return@launch
            val point = GeoPoint(fix.latitude, fix.longitude)
            map?.controller?.animateTo(point, 18.0, 650L)
            meMarker?.let { it.position = point; it.setVisible(true); map?.invalidate() }
        }
    }

    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { granted ->
        if (granted.values.any { it }) locate() else locationDenied = true
    }
    fun locateOrAsk() {
        if (CurrentLocation.isAllowed(context)) locate() else permission.launch(CurrentLocation.permissions)
    }

    LaunchedEffect(Unit) {
        if (start.locateOnOpen) locateOrAsk()
        if (addressLine.isBlank()) resolve(origin)
    }
    LaunchedEffect(isDark) { map?.let { MapStyle.apply(it, isDark) } }
    DisposableEffect(Unit) { onDispose { map?.onDetach() } }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DashitColors.Surface)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        ) {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { ctx ->
                    MapStyle.newMap(ctx, isDark).apply {
                        controller.setZoom(17.5)
                        controller.setCenter(origin)
                        // The store, so shoppers see where riders set off from.
                        overlays.add(Marker(this).apply {
                            position = GeoPoint(DeliveryEta.HUB_LAT, DeliveryEta.HUB_LNG)
                            icon = dot(ctx, 0xFFFF5B00.toInt(), 13f)
                            setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                            setInfoWindow(null)
                            title = "DASHit store"
                        })
                        val me = Marker(this).apply {
                            icon = dot(ctx, 0xFF2F7CF6.toInt(), 9f)
                            setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                            setInfoWindow(null)
                            setVisible(false)
                        }
                        overlays.add(me)
                        meMarker = me
                        var settle: Job? = null
                        addMapListener(object : MapListener {
                            override fun onScroll(event: ScrollEvent?): Boolean { moved(); return false }
                            override fun onZoom(event: ZoomEvent?): Boolean { moved(); return false }
                            private fun moved() {
                                if (!isMoving) isMoving = true
                                settle?.cancel()
                                settle = scope.launch {
                                    delay(280)
                                    isMoving = false
                                    val center = mapCenter as GeoPoint
                                    val hasMoved = DeliveryEta.haversineKm(pin.latitude, pin.longitude, center.latitude, center.longitude) > 0.005
                                    pin = GeoPoint(center.latitude, center.longitude)
                                    if (hasMoved || addressLine.isBlank()) resolve(pin)
                                }
                            }
                        })
                        map = this
                    }
                }
            )

            CentrePin(isMoving = isMoving, modifier = Modifier.align(Alignment.Center))

            // Back, over the map.
            Box(
                modifier = Modifier
                    .statusBarsPadding()
                    .padding(12.dp)
                    .size(42.dp)
                    .shadow(8.dp, CircleShape)
                    .clip(CircleShape)
                    .background(DashitColors.SurfaceRaised)
                    .pressable(scale = 0.9f) {
                        HapticsManager.light(view)
                        onBack()
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = DashitColors.TextPrimary, modifier = Modifier.size(20.dp))
            }

            Text(
                text = "Pin your address",
                color = DashitColors.TextPrimary,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .statusBarsPadding()
                    .padding(top = 18.dp)
                    .shadow(6.dp, RoundedCornerShape(50))
                    .clip(RoundedCornerShape(50))
                    .background(DashitColors.SurfaceRaised)
                    .padding(horizontal = 14.dp, vertical = 7.dp)
            )

            // Use my location.
            Box(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(14.dp)
                    .size(46.dp)
                    .shadow(10.dp, CircleShape)
                    .clip(CircleShape)
                    .background(DashitColors.SurfaceRaised)
                    .border(1.dp, DashitColors.Hairline, CircleShape)
                    .pressable(scale = 0.9f) {
                        HapticsManager.light(view)
                        locateOrAsk()
                    },
                contentAlignment = Alignment.Center
            ) {
                if (isLocating) {
                    CircularProgressIndicator(color = DashitColors.BrandOrange, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                } else {
                    Icon(Icons.Filled.MyLocation, contentDescription = "Use my current location", tint = DashitColors.BrandAccent, modifier = Modifier.size(21.dp))
                }
            }
        }

        // The form, lifted above the keyboard.
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(DashitColors.Surface)
                .navigationBarsPadding()
                .imePadding()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Icon(Icons.Filled.Place, contentDescription = null, tint = DashitColors.BrandAccent, modifier = Modifier.padding(top = 2.dp).size(18.dp))
                Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text(
                        text = when {
                            isMoving || isResolving -> "Locating…"
                            addressLine.isBlank() -> "Move the map to your door"
                            else -> addressLine
                        },
                        color = DashitColors.TextPrimary,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    val eta = StoreStatus.etaMinutes(quote)
                    Text(
                        text = when {
                            isMoving -> " "
                            quote.isDeliverable && eta != null -> "Delivery in $eta minutes · ${quote.distanceText}"
                            else -> "${quote.distanceText} from our store — we deliver within 5 km"
                        },
                        color = if (quote.isDeliverable) DashitColors.Positive else DashitColors.Danger,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            if (locationDenied) {
                Text(
                    "Location access is off. Allow it in Settings, or move the map to your door.",
                    color = DashitColors.TextMuted,
                    fontSize = 12.sp
                )
            }

            FormField(value = house, placeholder = "House / flat / floor", onChange = { house = it })
            FormField(value = landmark, placeholder = "Landmark (e.g. near Degree College)", onChange = { landmark = it })

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(
                    "Home" to Icons.Filled.Home,
                    "Work" to Icons.Filled.Business,
                    "Other" to Icons.Filled.Place
                ).forEach { (tag, icon) ->
                    TagChip(tag, icon, selected = nickname == tag) {
                        HapticsManager.selection(view)
                        nickname = tag
                    }
                }
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(if (canSave) DashitColors.BrandOrange else DashitColors.SurfaceMuted)
                    .pressable(scale = 0.98f) {
                        if (!canSave) return@pressable
                        HapticsManager.success(view)
                        val address = DeliveryAddress(
                            id = existing?.takeIf { it.nickname.equals(nickname, true) }?.id ?: java.util.UUID.randomUUID().toString(),
                            nickname = nickname,
                            street = addressLine.ifBlank { "Pinned location" },
                            houseNumber = house.trim().ifBlank { null },
                            landmark = landmark.trim().ifBlank { null },
                            latitude = pin.latitude,
                            longitude = pin.longitude
                        )
                        AddressBook.use(address)
                        onSaved(address)
                    },
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = if (quote.isDeliverable) "Confirm location" else "Outside our delivery area",
                    color = if (canSave) Color.White else DashitColors.TextFaint,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

/** Lifts while the map moves and drops back when it settles; its tip marks the map's centre. */
@Composable
private fun CentrePin(isMoving: Boolean, modifier: Modifier = Modifier) {
    val lift by animateDpAsState(if (isMoving) (-14).dp else 0.dp, spring(dampingRatio = 0.6f, stiffness = 500f), label = "pin_lift")
    val shadow by animateFloatAsState(if (isMoving) 0.6f else 1f, label = "pin_shadow")
    Box(modifier = modifier.offset(y = (-25).dp), contentAlignment = Alignment.BottomCenter) {
        Box(
            Modifier
                .offset(y = 2.dp)
                .size(width = 14.dp * shadow, height = 5.dp)
                .clip(CircleShape)
                .background(Color.Black.copy(alpha = 0.28f * shadow))
        )
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.offset(y = lift)) {
            Box(
                modifier = Modifier.size(34.dp).shadow(4.dp, CircleShape).clip(CircleShape).background(DashitColors.BrandOrange),
                contentAlignment = Alignment.Center
            ) {
                Box(Modifier.size(12.dp).clip(CircleShape).background(Color.White))
            }
            Box(Modifier.width(3.dp).height(16.dp).background(DashitColors.BrandOrange))
        }
    }
}

@Composable
private fun FormField(value: String, placeholder: String, onChange: (String) -> Unit) {
    BasicTextField(
        value = value,
        onValueChange = { onChange(it.take(80)) },
        singleLine = true,
        textStyle = TextStyle(color = DashitColors.TextPrimary, fontSize = 15.sp),
        cursorBrush = SolidColor(DashitColors.BrandOrange),
        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words, imeAction = ImeAction.Next),
        decorationBox = { inner ->
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(46.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(DashitColors.SurfaceMuted)
                    .padding(horizontal = 12.dp),
                contentAlignment = Alignment.CenterStart
            ) {
                if (value.isEmpty()) Text(placeholder, color = DashitColors.TextFaint, fontSize = 15.sp)
                inner()
            }
        }
    )
}

@Composable
private fun TagChip(label: String, icon: ImageVector, selected: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .height(36.dp)
            .clip(RoundedCornerShape(50))
            .background(if (selected) DashitColors.BrandOrange else DashitColors.SurfaceMuted)
            .pressable(scale = 0.94f, onClick = onClick)
            .padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Icon(icon, contentDescription = null, tint = if (selected) Color.White else DashitColors.TextSecondary, modifier = Modifier.size(15.dp))
        Text(label, color = if (selected) Color.White else DashitColors.TextSecondary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
    }
}

/** A round marker with a white ring, drawn once. */
private fun dot(context: android.content.Context, color: Int, radiusDp: Float): BitmapDrawable {
    val density = context.resources.displayMetrics.density
    val r = radiusDp * density
    val ring = 3f * density
    val size = ((r + ring) * 2).toInt() + 2
    val bitmap = android.graphics.Bitmap.createBitmap(size, size, android.graphics.Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    paint.color = android.graphics.Color.WHITE
    canvas.drawCircle(size / 2f, size / 2f, r + ring, paint)
    paint.color = color
    canvas.drawCircle(size / 2f, size / 2f, r, paint)
    return BitmapDrawable(context.resources, bitmap)
}
