package com.dashit.app.data.model

data class UserProfile(
    val id: String = "",
    val mobile: String = "",
    val name: String? = null,
    val email: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val defaultAddress: DeliveryAddress = DeliveryAddress()
) {
    val initials: String
        get() {
            val parts = (name ?: "User").trim().split(" ")
            return if (parts.size >= 2) {
                "${parts[0].firstOrNull() ?: 'U'}${parts[1].firstOrNull() ?: 'K'}".uppercase()
            } else {
                (name ?: "D").take(2).uppercase()
            }
        }
}
