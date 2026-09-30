# Razorpay Custom UI SDK (from Razorpay's Android integration guide)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
-keepattributes *Annotation*
-dontwarn com.razorpay.**
-keep class com.razorpay.** { *; }
-optimizations !method/inlining/*
-keepclasseswithmembers class * {
    public void onPayment*(...);
}

# Credential Manager finds its Play services provider by reflection.
-if class androidx.credentials.CredentialManager
-keep class androidx.credentials.playservices.** {
  *;
}
