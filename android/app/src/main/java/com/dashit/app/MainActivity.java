package com.dashit.app;

import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.content.res.Configuration;
import android.webkit.JavascriptInterface;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;
import android.content.Context;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import androidx.core.app.NotificationCompat;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final int RC_GOOGLE_SIGN_IN = 9001;
    private static final int RC_SPEECH_RECOGNIZE = 9002;
    private static final int RC_NOTIFICATION_PERM = 9003;
    private static final String CHANNEL_LIVE_ORDER = "dashit_live_orders";
    private static final String CHANNEL_ALERTS = "dashit_order_alerts";
    private static final int NOTIF_ID_LIVE = 9821;
    private GoogleSignInClient mGoogleSignInClient;

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (manager != null) {
                    NotificationChannel liveChannel = new NotificationChannel(
                        CHANNEL_LIVE_ORDER,
                        "Dashit Live Order Tracking",
                        NotificationManager.IMPORTANCE_LOW
                    );
                    liveChannel.setDescription("Live progress and status updates for active orders");
                    liveChannel.setShowBadge(false);
                    liveChannel.enableVibration(false);
                    liveChannel.setSound(null, null);
                    manager.createNotificationChannel(liveChannel);

                    NotificationChannel alertChannel = new NotificationChannel(
                        CHANNEL_ALERTS,
                        "Dashit Order Alerts",
                        NotificationManager.IMPORTANCE_HIGH
                    );
                    alertChannel.setDescription("Order confirmations and delivery arrivals");
                    alertChannel.setShowBadge(true);
                    alertChannel.enableVibration(true);
                    manager.createNotificationChannel(alertChannel);
                }
            } catch (Exception ignored) {}
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        androidx.core.splashscreen.SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        createNotificationChannels();
        
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
        
        boolean isNightMode = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        
        int appBgColor = isNightMode ? Color.parseColor("#14171F") : Color.parseColor("#FFE8D6");
        window.setStatusBarColor(appBgColor);
        
        int navBgColor = isNightMode ? Color.parseColor("#14171F") : Color.parseColor("#FFFFFF");
        window.setNavigationBarColor(navBgColor);
        
        WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, window.getDecorView());
        if (insetsController != null) {
            insetsController.setAppearanceLightStatusBars(!isNightMode);
            insetsController.setAppearanceLightNavigationBars(!isNightMode);
        }

        int initFlags = 0;
        if (!isNightMode) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                initFlags = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                initFlags = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            }
        }
        window.getDecorView().setSystemUiVisibility(initFlags);

        // Initialize Official Google Play Services Sign-In with Web Client ID for Firebase Auth
        try {
            String serverClientId = "391742831837-6f1p9j22s60ar9fpc9sm0j2gkd5c0t9s.apps.googleusercontent.com";
            GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(serverClientId)
                .requestEmail()
                .requestProfile()
                .build();
            mGoogleSignInClient = GoogleSignIn.getClient(this, gso);
        } catch (Exception ignored) {}

        if (this.bridge != null && this.bridge.getWebView() != null) {
            android.webkit.WebView webView = this.bridge.getWebView();
            android.webkit.WebView.setWebContentsDebuggingEnabled(true);
            webView.setBackgroundColor(isNightMode ? Color.parseColor("#14171F") : Color.parseColor("#FFFFFF"));
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            webView.setVerticalScrollBarEnabled(false);
            webView.setHorizontalScrollBarEnabled(false);

            // 60FPS+ Hardware acceleration & smooth performance optimizations
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
            android.webkit.WebSettings settings = webView.getSettings();
            if (settings != null) {
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setRenderPriority(android.webkit.WebSettings.RenderPriority.HIGH);
            }

            // Interface 1: AndroidBars (Dynamic status & nav bar colors)
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void setBars(final String topColor, final boolean topDarkIcons, final String bottomColor, final boolean bottomDarkIcons) {
                    runOnUiThread(() -> {
                        try {
                            Window win = getWindow();
                            win.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                            win.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
                            win.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);

                            if (topColor != null && !topColor.isEmpty() && !topColor.equals("#00000000")) {
                                win.setStatusBarColor(Color.parseColor(topColor));
                            }
                            if (bottomColor != null && !bottomColor.isEmpty()) {
                                win.setNavigationBarColor(Color.parseColor(bottomColor));
                            }

                            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(win, win.getDecorView());
                            if (controller != null) {
                                controller.setAppearanceLightStatusBars(topDarkIcons);
                                controller.setAppearanceLightNavigationBars(bottomDarkIcons);
                            }

                            int flags = win.getDecorView().getSystemUiVisibility();
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                if (topDarkIcons) {
                                    flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                                } else {
                                    flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                                }
                            }
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                if (bottomDarkIcons) {
                                    flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                                } else {
                                    flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                                }
                            }
                            win.getDecorView().setSystemUiVisibility(flags);
                        } catch (Exception ignored) {}
                    });
                }
            }, "AndroidBars");


            // Interface 2: AndroidGoogleAuth (Official Google Account Chooser bottom sheet)
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void signIn() {
                    runOnUiThread(() -> {
                        try {
                            if (mGoogleSignInClient != null) {
                                mGoogleSignInClient.signOut().addOnCompleteListener(MainActivity.this, t -> {
                                    Intent signInIntent = mGoogleSignInClient.getSignInIntent();
                                    startActivityForResult(signInIntent, RC_GOOGLE_SIGN_IN);
                                });
                            } else {
                                sendGoogleAuthError("Google Play Services not initialized");
                            }
                        } catch (Exception e) {
                            sendGoogleAuthError(e.getMessage());
                        }
                    });
                }

                @JavascriptInterface
                public boolean isAvailable() {
                    return mGoogleSignInClient != null;
                }
            }, "AndroidGoogleAuth");

            // Interface 3: AndroidFlavor (Allows webview to detect Customer vs Admin vs Driver APK)
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public String getFlavor() {
                    String pkg = MainActivity.this.getPackageName();
                    if (pkg.contains("admin")) return "admin";
                    if (pkg.contains("driver")) return "driver";
                    return "customer";
                }

                @JavascriptInterface
                public boolean isAdmin() {
                    return MainActivity.this.getPackageName().contains("admin");
                }

                @JavascriptInterface
                public boolean isDriver() {
                    return MainActivity.this.getPackageName().contains("driver");
                }
            }, "AndroidFlavor");

            // Interface 4: AndroidTruecaller (Native Truecaller 1-Tap intent dispatcher)
            webView.addJavascriptInterface(new Object() {
                /*
                 * Only the Truecaller SDK scheme is dispatched, and only to the
                 * Truecaller package.
                 *
                 * A @JavascriptInterface method is callable by whatever runs in the
                 * WebView, so accepting an arbitrary URL here turned the app into a
                 * general intent launcher: any script that got a foothold could fire
                 * ACTION_VIEW at market://, tel:, an intent:// URI, or a file:// path
                 * belonging to another app.
                 */
                @JavascriptInterface
                public boolean openTruecaller(final String url) {
                    try {
                        if (url == null || !url.startsWith("truecallersdk://")) {
                            return false;
                        }
                        Intent intent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url));
                        intent.setPackage("com.truecaller");
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        return false;
                    }
                }

                @JavascriptInterface
                public boolean isAppInstalled() {
                    try {
                        getPackageManager().getPackageInfo("com.truecaller", 0);
                        return true;
                    } catch (Exception e) {
                        return false;
                    }
                }
            }, "AndroidTruecaller");

            // Interface 5: AndroidSpeech (Native Google Voice Search)
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void startListening() {
                    runOnUiThread(() -> {
                        try {
                            Intent intent = new Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                            intent.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL, android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                            intent.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE, "en-IN");
                            intent.putExtra(android.speech.RecognizerIntent.EXTRA_PROMPT, "Search groceries, milk, snacks on DASHit…");
                            startActivityForResult(intent, RC_SPEECH_RECOGNIZE);
                        } catch (android.content.ActivityNotFoundException e) {
                            sendSpeechError("Voice search is not supported on this device.");
                        } catch (Exception e) {
                            sendSpeechError(e.getMessage());
                        }
                    });
                }

                @JavascriptInterface
                public boolean isAvailable() {
                    try {
                        Intent intent = new Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                        return getPackageManager().queryIntentActivities(intent, 0).size() > 0;
                    } catch (Exception e) {
                        return false;
                    }
                }
            }, "AndroidSpeech");

            // Interface 6: AndroidNotifications (Direct native notification widget & alerts without exact alarm)
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void requestNotificationPermission() {
                    runOnUiThread(() -> {
                        try {
                            if (Build.VERSION.SDK_INT >= 33) {
                                if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                                    requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, RC_NOTIFICATION_PERM);
                                }
                            }
                        } catch (Exception ignored) {}
                    });
                }

                @JavascriptInterface
                public boolean hasNotificationPermission() {
                    try {
                        if (Build.VERSION.SDK_INT >= 33) {
                            return checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED;
                        }
                        return true;
                    } catch (Exception e) {
                        return true;
                    }
                }

                @JavascriptInterface
                public void postLiveOrderNotification(final String orderId, final String storeName, final String headline, final String subtitle, final int progressPct, final int etaMinutes, final boolean isDelivered) {
                    runOnUiThread(() -> {
                        try {
                            if (Build.VERSION.SDK_INT >= 33) {
                                if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                                    return;
                                }
                            }
                            createNotificationChannels();

                            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                            if (manager == null) return;

                            String hub = (storeName != null && !storeName.isEmpty()) ? storeName : "DASHit Express Hub · Anantnag";
                            String head = (headline != null && !headline.isEmpty()) ? headline : "Order processing";
                            String sub = (subtitle != null && !subtitle.isEmpty()) ? subtitle : "On time";

                            int clampedProgress = Math.max(0, Math.min(100, progressPct));

                            Intent intent = new Intent(MainActivity.this, MainActivity.class);
                            intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                            PendingIntent pendingIntent = PendingIntent.getActivity(
                                MainActivity.this,
                                0,
                                intent,
                                Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE : PendingIntent.FLAG_UPDATE_CURRENT
                            );

                            NotificationCompat.Builder builder = new NotificationCompat.Builder(MainActivity.this, CHANNEL_LIVE_ORDER)
                                .setSmallIcon(R.drawable.ic_stat_dashit)
                                .setColor(0xFFFF5B00)
                                .setContentTitle(hub)
                                .setContentText(head + " · " + sub)
                                .setSubText("Order #" + (orderId != null ? orderId : "DASH"))
                                .setProgress(100, clampedProgress, false)
                                .setOngoing(!isDelivered)
                                .setAutoCancel(isDelivered)
                                .setOnlyAlertOnce(true)
                                .setPriority(NotificationCompat.PRIORITY_LOW)
                                .setCategory(NotificationCompat.CATEGORY_PROGRESS)
                                .setContentIntent(pendingIntent)
                                .setStyle(new NotificationCompat.BigTextStyle()
                                    .setBigContentTitle(hub)
                                    .setSummaryText(isDelivered ? "Delivered" : "On time | Arriving in " + etaMinutes + " mins")
                                    .bigText(head + "\n" + sub));

                            manager.notify(NOTIF_ID_LIVE, builder.build());
                        } catch (Exception ignored) {}
                    });
                }

                @JavascriptInterface
                public void postAlertNotification(final String title, final String body) {
                    runOnUiThread(() -> {
                        try {
                            if (Build.VERSION.SDK_INT >= 33) {
                                if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                                    return;
                                }
                            }
                            createNotificationChannels();

                            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                            if (manager == null) return;

                            Intent intent = new Intent(MainActivity.this, MainActivity.class);
                            intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                            PendingIntent pendingIntent = PendingIntent.getActivity(
                                MainActivity.this,
                                0,
                                intent,
                                Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE : PendingIntent.FLAG_UPDATE_CURRENT
                            );

                            NotificationCompat.Builder builder = new NotificationCompat.Builder(MainActivity.this, CHANNEL_ALERTS)
                                .setSmallIcon(R.drawable.ic_stat_dashit)
                                .setColor(0xFFFF5B00)
                                .setContentTitle(title != null ? title : "DASHit")
                                .setContentText(body != null ? body : "")
                                .setAutoCancel(true)
                                .setPriority(NotificationCompat.PRIORITY_HIGH)
                                .setContentIntent(pendingIntent)
                                .setStyle(new NotificationCompat.BigTextStyle().bigText(body != null ? body : ""));

                            int alertId = (int) (System.currentTimeMillis() % 100000);
                            manager.notify(alertId, builder.build());
                        } catch (Exception ignored) {}
                    });
                }

                @JavascriptInterface
                public void clearLiveOrderNotification() {
                    runOnUiThread(() -> {
                        try {
                            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                            if (manager != null) {
                                manager.cancel(NOTIF_ID_LIVE);
                            }
                        } catch (Exception ignored) {}
                    });
                }
            }, "AndroidNotifications");
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == RC_GOOGLE_SIGN_IN) {
            /*
             * A sign-in either produces a Google ID token or it fails. There is no
             * middle ground and nothing is guessed.
             *
             * The previous version, when the Play Services call failed, fell back to
             * reading the device's account list and — if that also came up empty —
             * hardcoded a specific developer's email address, then reported SUCCESS
             * with an empty idToken. The web layer accepted that, signed in
             * anonymously and wrote the fabricated email onto the profile: a failed
             * or cancelled sign-in silently became a logged-in session under someone
             * else's identity.
             */
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            try {
                GoogleSignInAccount account = task.getResult(ApiException.class);
                String idToken = (account != null && account.getIdToken() != null) ? account.getIdToken() : "";

                if (account == null || idToken.isEmpty()) {
                    // No verifiable token means no proof of identity.
                    sendGoogleAuthError("Google Sign-In could not be verified. Please try again.");
                    return;
                }

                String email = account.getEmail() != null ? account.getEmail() : "";
                String displayName = account.getDisplayName() != null ? account.getDisplayName() : "";
                String id = account.getId() != null ? account.getId() : "";
                String photoUrl = account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : "";
                sendGoogleAuthSuccess(email, displayName, id, photoUrl, idToken);
            } catch (ApiException e) {
                android.util.Log.w("DashitAuth", "Google Sign-In failed, code=" + e.getStatusCode());
                if (e.getStatusCode() == 12501 || e.getStatusCode() == 16) {
                    sendGoogleAuthError("Google Sign-In dismissed");
                } else {
                    sendGoogleAuthError("Google Sign-In failed. Please try again.");
                }
            }
        } else if (requestCode == RC_SPEECH_RECOGNIZE) {
            if (resultCode == RESULT_OK && data != null) {
                java.util.ArrayList<String> matches = data.getStringArrayListExtra(android.speech.RecognizerIntent.EXTRA_RESULTS);
                if (matches != null && !matches.isEmpty()) {
                    String spokenText = matches.get(0);
                    sendSpeechResult(spokenText);
                } else {
                    sendSpeechError("No speech detected");
                }
            } else {
                sendSpeechError("Voice search dismissed");
            }
        }
    }

    private void sendSpeechResult(String text) {
        runOnUiThread(() -> {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                try {
                    JSONObject obj = new JSONObject();
                    obj.put("text", text != null ? text : "");
                    String script = "if (window.onNativeSpeechResult) { window.onNativeSpeechResult(" + obj.toString() + "); }";
                    this.bridge.getWebView().evaluateJavascript(script, null);
                } catch (Exception ignored) {}
            }
        });
    }

    private void sendSpeechError(String error) {
        runOnUiThread(() -> {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                try {
                    JSONObject obj = new JSONObject();
                    obj.put("message", error != null ? error : "");
                    String script = "if (window.onNativeSpeechError) { window.onNativeSpeechError(" + obj.toString() + "); }";
                    this.bridge.getWebView().evaluateJavascript(script, null);
                } catch (Exception ignored) {}
            }
        });
    }

    private void sendGoogleAuthSuccess(String email, String displayName, String id, String photoUrl, String idToken) {
        runOnUiThread(() -> {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                JSONObject obj = new JSONObject();
                try {
                    obj.put("email", email);
                    obj.put("displayName", displayName);
                    obj.put("id", id);
                    obj.put("photoUrl", photoUrl);
                    obj.put("idToken", idToken != null ? idToken : "");
                } catch (Exception ignored) {}
                String script = "if (window.onNativeGoogleSignInSuccess) { window.onNativeGoogleSignInSuccess(" + obj.toString() + "); }";
                this.bridge.getWebView().evaluateJavascript(script, null);
            }
        });
    }

    private void sendGoogleAuthError(String error) {
        runOnUiThread(() -> {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                JSONObject obj = new JSONObject();
                try {
                    obj.put("message", error);
                } catch (Exception ignored) {}
                String script = "if (window.onNativeGoogleSignInError) { window.onNativeGoogleSignInError(" + obj.toString() + "); }";
                this.bridge.getWebView().evaluateJavascript(script, null);
            }
        });
    }
}

