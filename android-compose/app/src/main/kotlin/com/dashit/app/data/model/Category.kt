package com.dashit.app.data.model

data class Category(
    val id: String,
    val name: String,
    val icon: String? = null,
    val image: String? = null,
    val sortOrder: Int? = 0,
    val itemCount: Int? = null
)

data class CategoryTile(
    val id: String,
    val name: String,
    val previewImages: List<String>,
    val productCount: Int
)
