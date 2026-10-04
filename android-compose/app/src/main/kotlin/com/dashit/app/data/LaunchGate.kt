package com.dashit.app.data

object LaunchGate {
    /** 5th October 2026, 10:00 AM IST (Asia/Kolkata +05:30) = 1791174600000L */
    const val LAUNCH_TIMESTAMP = 1791174600000L
    const val LAUNCH_LABEL = "Orders open 5 Oct, 10 am"
    const val LAUNCH_DAY = "Monday, 5 Oct at 10:00 AM"

    val isBeforeLaunch: Boolean
        get() = System.currentTimeMillis() < LAUNCH_TIMESTAMP
}
