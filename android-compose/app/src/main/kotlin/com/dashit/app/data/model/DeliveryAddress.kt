package com.dashit.app.data.model

import java.util.UUID

data class DeliveryAddress(
    val id: String = UUID.randomUUID().toString(),
    var nickname: String = "HOME",
    var street: String = "Court Road, Lal Chowk",
    var houseNumber: String? = null,
    var landmark: String? = null,
    var city: String = "Anantnag",
    var pincode: String = "192101",
    var latitude: Double = 33.7311,
    var longitude: Double = 75.1487,
    var receiverName: String? = null,
    var receiverPhone: String? = null
) {
    val displaySummary: String
        get() = "${nickname.uppercase()} · $street, $city"

    /** House, street and landmark, as the rider reads it. */
    val doorLine: String
        get() = listOfNotNull(houseNumber?.takeIf { it.isNotBlank() }, street.takeIf { it.isNotBlank() }).joinToString(", ") +
            (landmark?.takeIf { it.isNotBlank() }?.let { " · near $it" } ?: "")

    /** Everything the rider needs to find the door, in one line. */
    val formattedSummary: String
        get() = listOfNotNull(
            houseNumber?.takeIf { it.isNotBlank() },
            street.takeIf { it.isNotBlank() },
            landmark?.takeIf { it.isNotBlank() }?.let { "near $it" },
            "$city, $pincode"
        ).joinToString(", ")
}
