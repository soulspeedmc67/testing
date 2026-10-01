package com.dashit.app.data

import android.content.Context
import android.content.Intent
import android.graphics.drawable.Drawable
import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject

/**
 * One way to pay online, picked in the checkout before Razorpay opens. The
 * checkout then shows only that way (a UPI app, cards, netbanking...), so the
 * shopper chooses in DASHit, not in a long list inside Razorpay.
 */
data class PayOption(
    /** Saved as the shopper's last choice: "upi:<package>", "upi", "card", ... */
    val id: String,
    val title: String,
    val subtitle: String,
    /** Razorpay's method: upi, card, netbanking, wallet, emi, paylater. */
    val method: String,
    /** Razorpay's name for a UPI app, when this is one. */
    val upiApp: String? = null,
    val icon: Drawable? = null
) {
    /** Razorpay checkout options showing only this way to pay. */
    fun checkoutConfig(): JSONObject {
        val instruments = JSONArray()
        when {
            upiApp != null -> instruments.put(
                JSONObject().put("method", "upi").put("flows", JSONArray().put("intent")).put("apps", JSONArray().put(upiApp))
            )
            method == "emi" -> {
                instruments.put(JSONObject().put("method", "emi"))
                instruments.put(JSONObject().put("method", "cardless_emi"))
            }
            else -> instruments.put(JSONObject().put("method", method))
        }
        return JSONObject().put(
            "display",
            JSONObject()
                .put("blocks", JSONObject().put("dashit", JSONObject().put("name", title).put("instruments", instruments)))
                .put("sequence", JSONArray().put("block.dashit"))
                .put("preferences", JSONObject().put("show_default_blocks", false))
        )
    }

    companion object {
        /** UPI apps Razorpay can open directly, by Android package. */
        private val KNOWN_UPI_APPS = listOf(
            Triple("com.google.android.apps.nbu.paisa.user", "Google Pay", "google_pay"),
            Triple("com.phonepe.app", "PhonePe", "phonepe"),
            Triple("net.one97.paytm", "Paytm", "paytm"),
            Triple("in.org.npci.upiapp", "BHIM", "bhim"),
            Triple("com.dreamplug.androidapp", "CRED", "cred"),
            Triple("in.amazon.mShop.android.shopping", "Amazon Pay", "amazon_pay"),
            Triple("com.naviapp", "Navi", "navi"),
            Triple("money.super.payments", "super.money", "super_money"),
            Triple("com.mobikwik_new", "MobiKwik", "mobikwik"),
            Triple("com.whatsapp", "WhatsApp", "whatsapp")
        )

        /** The UPI apps on this phone that can pay, best known first. */
        fun installedUpiApps(context: Context): List<PayOption> {
            val pm = context.packageManager
            val handlers = runCatching {
                pm.queryIntentActivities(Intent(Intent.ACTION_VIEW, Uri.parse("upi://pay")), 0)
                    .map { it.activityInfo.packageName }
                    .toSet()
            }.getOrDefault(emptySet())
            // Installed, even if its UPI link isn't switched on yet (not set up there): if it
            // can't pay, the shopper backs out of Razorpay and picks another way here.
            fun isInstalled(pkg: String) = runCatching { pm.getPackageInfo(pkg, 0); true }.getOrDefault(false)
            return KNOWN_UPI_APPS.filter { it.first in handlers || isInstalled(it.first) }.map { (pkg, name, razorpayName) ->
                PayOption(
                    id = "upi:$pkg",
                    title = name,
                    subtitle = "UPI",
                    method = "upi",
                    upiApp = razorpayName,
                    icon = runCatching { pm.getApplicationIcon(pkg) }.getOrNull()
                )
            }
        }

        val anyUpi = PayOption("upi", "Any UPI app or UPI ID", "Pay from any UPI app, or enter your UPI ID", "upi")

        /** Everything besides UPI that Razorpay takes in India. */
        val others = listOf(
            PayOption("card", "Credit or debit card", "Visa, Mastercard, RuPay, Amex", "card"),
            PayOption("netbanking", "Netbanking", "All major Indian banks", "netbanking"),
            PayOption("wallet", "Wallets", "Paytm, PhonePe, Amazon Pay, MobiKwik and more", "wallet"),
            PayOption("emi", "EMI", "Card and cardless EMI", "emi"),
            PayOption("paylater", "Pay Later", "Simpl, LazyPay, ICICI PayLater and more", "paylater")
        )

        fun all(context: Context): List<PayOption> = installedUpiApps(context) + anyUpi + others
    }
}
