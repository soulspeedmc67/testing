package com.dashit.app.core.design

import androidx.compose.ui.geometry.Offset
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class FlyParticle(
    val id: Long = System.nanoTime(),
    val imageUrl: String,
    val startX: Float,
    val startY: Float,
    val targetX: Float,
    val targetY: Float
)

object FlyToCartManager {
    private val _particles = MutableStateFlow<List<FlyParticle>>(emptyList())
    val particles: StateFlow<List<FlyParticle>> = _particles.asStateFlow()

    private var targetPosition = Offset.Zero
    private var lastBounceTrigger = MutableStateFlow(0L)
    val bounceTrigger: StateFlow<Long> = lastBounceTrigger.asStateFlow()

    fun registerTarget(target: Offset) {
        targetPosition = target
    }

    fun trigger(imageUrl: String, startOffset: Offset) {
        val target = if (targetPosition != Offset.Zero) targetPosition else Offset(540f, 2100f)
        val particle = FlyParticle(
            imageUrl = imageUrl,
            startX = startOffset.x,
            startY = startOffset.y,
            targetX = target.x,
            targetY = target.y
        )
        _particles.update { it + particle }
    }

    fun onParticleLanded(id: Long) {
        removeParticle(id)
        lastBounceTrigger.value = System.currentTimeMillis()
    }

    fun removeParticle(id: Long) {
        _particles.update { list -> list.filterNot { it.id == id } }
    }
}
