package com.dashit.app.ui.address

import android.content.Context
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FamilyRestroom
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.SheetState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.dashit.app.core.design.DashitColors
import com.dashit.app.core.design.HapticsManager
import com.dashit.app.core.design.pressable
import com.dashit.app.data.model.DeliveryAddress
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import java.io.File

data class SavedAddressItem(
    val id: String,
    val nickname: String,
    val street: String,
    val area: String,
    val icon: ImageVector,
    val lat: Double,
    val lng: Double
)

private val SAVED_ADDRESSES = listOf(
    SavedAddressItem(
        id = "addr_home",
        nickname = "HOME",
        street = "Court Road, Lal Chowk",
        area = "Anantnag, 192101",
        icon = Icons.Default.Home,
        lat = 33.7385,
        lng = 75.1566
    ),
    SavedAddressItem(
        id = "addr_work",
        nickname = "WORK",
        street = "KP Road Commercial Complex",
        area = "Khanabal, Anantnag, 192101",
        icon = Icons.Default.Business,
        lat = 33.7360,
        lng = 75.1418
    ),
    SavedAddressItem(
        id = "addr_parents",
        nickname = "PARENTS",
        street = "Mattan Chowk, Near Sun Temple Road",
        area = "Mattan, Anantnag, 192125",
        icon = Icons.Default.FamilyRestroom,
        lat = 33.7712,
        lng = 75.2078
    )
)

private val POPULAR_AREAS = listOf(
    "Court Road, Lal Chowk, Anantnag",
    "KP Road, Khanabal, Anantnag",
    "Mattan Adda, Anantnag",
    "Ashajipora, Anantnag",
    "Dialgam, Anantnag",
    "Janglat Mandi, Anantnag",
    "Mehandi Kadal, Anantnag",
    "Reshi Bazar, Anantnag",
    "Batengoo Bypass, Anantnag",
    "Sarnal, Anantnag"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddressSelectionSheet(
    currentAddress: DeliveryAddress,
    sheetState: SheetState,
    onDismiss: () -> Unit,
    onSelectAddress: (DeliveryAddress) -> Unit
) {
    val view = LocalView.current
    val focusManager = LocalFocusManager.current
    var searchQuery by remember { mutableStateOf("") }
    var isMapPickerMode by remember { mutableStateOf(false) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Color(0xFF161A23),
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(top = 10.dp, bottom = 6.dp)
                    .size(width = 38.dp, height = 4.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF384054))
            )
        }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .animateContentSize()
                .navigationBarsPadding()
                .padding(bottom = 20.dp)
        ) {
            if (isMapPickerMode) {
                // Interactive OpenStreetMap Pin Picker
                OsmPinPickerView(
                    initialLat = currentAddress.latitude,
                    initialLng = currentAddress.longitude,
                    onCancel = { isMapPickerMode = false },
                    onConfirm = { geoPoint ->
                        HapticsManager.medium(view)
                        val updated = currentAddress.copy(
                            street = "Selected on Map (Lal Chowk)",
                            latitude = geoPoint.latitude,
                            longitude = geoPoint.longitude
                        )
                        onSelectAddress(updated)
                        onDismiss()
                    }
                )
            } else {
                // Main 3-Option Sheet
                // Title & Close
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Select delivery location",
                            color = Color.White,
                            fontSize = 19.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Choose from saved, search, or pinpoint on map",
                            color = DashitColors.TextMuted,
                            fontSize = 12.sp
                        )
                    }

                    Box(
                        modifier = Modifier
                            .size(34.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF242A38))
                            .pressable(scale = 0.90f) {
                                HapticsManager.light(view)
                                onDismiss()
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // OPTION 1: Add location manually (by searching using text)
                Column(modifier = Modifier.padding(horizontal = 20.dp)) {
                    Text(
                        text = "SEARCH & ADD MANUALLY",
                        color = DashitColors.FestiveGold,
                        fontSize = 10.5.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.6.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))

                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = {
                            Text(
                                text = "Search area, street, or landmark...",
                                color = DashitColors.TextMuted,
                                fontSize = 13.5.sp
                            )
                        },
                        leadingIcon = {
                            Icon(
                                imageVector = Icons.Default.Search,
                                contentDescription = null,
                                tint = DashitColors.TextMuted,
                                modifier = Modifier.size(20.dp)
                            )
                        },
                        trailingIcon = {
                            if (searchQuery.isNotEmpty()) {
                                Icon(
                                    imageVector = Icons.Default.Close,
                                    contentDescription = "Clear",
                                    tint = Color.White,
                                    modifier = Modifier
                                        .size(18.dp)
                                        .clickable { searchQuery = "" }
                                )
                            }
                        },
                        singleLine = true,
                        shape = RoundedCornerShape(14.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = Color(0xFF1D222E),
                            unfocusedContainerColor = Color(0xFF1D222E),
                            focusedBorderColor = DashitColors.BlinkitGreen,
                            unfocusedBorderColor = DashitColors.HairlineStrong,
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        ),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = {
                            focusManager.clearFocus()
                            if (searchQuery.isNotBlank()) {
                                HapticsManager.medium(view)
                                val updated = currentAddress.copy(
                                    nickname = "CUSTOM",
                                    street = searchQuery.trim()
                                )
                                onSelectAddress(updated)
                                onDismiss()
                            }
                        })
                    )
                }

                // If user is searching, show live filtered area suggestions
                val filteredSuggestions = remember(searchQuery) {
                    if (searchQuery.isBlank()) emptyList()
                    else POPULAR_AREAS.filter { it.contains(searchQuery, ignoreCase = true) }
                }

                if (filteredSuggestions.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF1B202B))
                            .border(1.dp, DashitColors.Hairline, RoundedCornerShape(12.dp))
                    ) {
                        filteredSuggestions.forEach { area ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        HapticsManager.light(view)
                                        val parts = area.split(",")
                                        val streetPart = parts.firstOrNull()?.trim() ?: area
                                        val updated = currentAddress.copy(
                                            nickname = "LOCATION",
                                            street = streetPart
                                        )
                                        onSelectAddress(updated)
                                        onDismiss()
                                    }
                                    .padding(horizontal = 14.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.LocationOn,
                                    contentDescription = null,
                                    tint = DashitColors.BlinkitGreen,
                                    modifier = Modifier.size(18.dp)
                                )
                                Text(
                                    text = area,
                                    color = Color.White,
                                    fontSize = 13.5.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // OPTION 2: Select on Map
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color(0xFF1C2230))
                        .border(1.dp, Color(0xFF2C3549), RoundedCornerShape(14.dp))
                        .pressable(scale = 0.98f) {
                            HapticsManager.light(view)
                            isMapPickerMode = true
                        }
                        .padding(horizontal = 14.dp, vertical = 12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(38.dp)
                                .clip(CircleShape)
                                .background(DashitColors.BlinkitGreenDark),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Map,
                                contentDescription = "Map Pinpoint",
                                tint = DashitColors.BlinkitGreen,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Select on map",
                                color = Color.White,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Pinpoint exact doorstep on OpenStreetMap",
                                color = DashitColors.TextMuted,
                                fontSize = 11.5.sp
                            )
                        }

                        Text(
                            text = "Locate >",
                            color = DashitColors.FestiveGold,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // OPTION 3: List of all saved addresses
                Column(modifier = Modifier.padding(horizontal = 20.dp)) {
                    Text(
                        text = "SAVED ADDRESSES",
                        color = DashitColors.TextMuted,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.6.sp
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    SAVED_ADDRESSES.forEach { saved ->
                        val isSelected = currentAddress.nickname.equals(saved.nickname, ignoreCase = true)

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(if (isSelected) Color(0xFF1E2636) else Color(0xFF181C26))
                                .border(
                                    1.dp,
                                    if (isSelected) DashitColors.BlinkitGreen else DashitColors.Hairline,
                                    RoundedCornerShape(14.dp)
                                )
                                .pressable(scale = 0.98f) {
                                    HapticsManager.light(view)
                                    val updated = currentAddress.copy(
                                        nickname = saved.nickname,
                                        street = saved.street,
                                        latitude = saved.lat,
                                        longitude = saved.lng
                                    )
                                    onSelectAddress(updated)
                                    onDismiss()
                                }
                                .padding(horizontal = 14.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(if (isSelected) DashitColors.BlinkitGreenDark else Color(0xFF242A38)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = saved.icon,
                                    contentDescription = saved.nickname,
                                    tint = if (isSelected) DashitColors.BlinkitGreen else Color.White,
                                    modifier = Modifier.size(19.dp)
                                )
                            }

                            Column(modifier = Modifier.weight(1f)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(
                                        text = saved.nickname,
                                        color = Color.White,
                                        fontSize = 13.5.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    if (isSelected) {
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(4.dp))
                                                .background(DashitColors.BlinkitGreenDark)
                                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                        ) {
                                            Text(
                                                text = "ACTIVE",
                                                color = DashitColors.BlinkitGreen,
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Black
                                            )
                                        }
                                    }
                                }

                                Text(
                                    text = "${saved.street}, ${saved.area}",
                                    color = DashitColors.TextSecondary,
                                    fontSize = 12.sp,
                                    maxLines = 1
                                )
                            }

                            if (isSelected) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = "Selected",
                                    tint = DashitColors.BlinkitGreen,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OsmPinPickerView(
    initialLat: Double,
    initialLng: Double,
    onCancel: () -> Unit,
    onConfirm: (GeoPoint) -> Unit
) {
    val context = LocalContext.current
    val view = LocalView.current
    var pickerMap by remember { mutableStateOf<MapView?>(null) }

    DisposableEffect(Unit) {
        onDispose {
            pickerMap?.onDetach()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .height(450.dp)
    ) {
        // Picker Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Move map to set pin",
                color = Color.White,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )

            Text(
                text = "Cancel",
                color = DashitColors.TextMuted,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.clickable { onCancel() }
            )
        }

        // Map with Central Pin
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        ) {
            AndroidView(
                factory = { ctx ->
                    val config = Configuration.getInstance()
                    config.load(ctx, ctx.getSharedPreferences("osmdroid", Context.MODE_PRIVATE))
                    config.userAgentValue = "DASHit-App/1.0 (https://dashit.in; support@dashit.in)"
                    val basePath = File(ctx.cacheDir, "osmdroid").apply { mkdirs() }
                    val tileCache = File(basePath, "tiles").apply { mkdirs() }
                    config.osmdroidBasePath = basePath
                    config.osmdroidTileCache = tileCache

                    MapView(ctx).apply {
                        setTileSource(TileSourceFactory.MAPNIK)
                        setUseDataConnection(true)
                        setMultiTouchControls(true)
                        isTilesScaledToDpi = true
                        minZoomLevel = 12.0
                        maxZoomLevel = 20.0
                        zoomController.setVisibility(org.osmdroid.views.CustomZoomButtonsController.Visibility.NEVER)
                        controller.setZoom(16.5)
                        controller.setCenter(GeoPoint(initialLat, initialLng))

                        pickerMap = this
                    }
                },
                modifier = Modifier.fillMaxSize()
            )

            // Centered Map Pin
            Column(
                modifier = Modifier.align(Alignment.Center),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.Black.copy(alpha = 0.75f))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "Deliver here",
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Icon(
                    imageVector = Icons.Default.LocationOn,
                    contentDescription = null,
                    tint = DashitColors.BrandOrange,
                    modifier = Modifier.size(38.dp)
                )
            }
        }

        // Confirm Location Button
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(DashitColors.BlinkitGreen)
                .pressable(scale = 0.98f) {
                    HapticsManager.medium(view)
                    val center = pickerMap?.mapCenter as? GeoPoint ?: GeoPoint(initialLat, initialLng)
                    onConfirm(center)
                }
                .padding(vertical = 14.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "Confirm Location",
                color = Color.White,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}
