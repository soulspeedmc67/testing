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
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;

public class MainActivity extends BridgeActivity {
    private static final int RC_GOOGLE_SIGN_IN = 9001;
    private static final int RC_SPEECH_RECOGNIZE = 9002;
    private static final int RC_NOTIFICATION_PERM = 9003;
    private static final String CHANNEL_LIVE_ORDER = "dashit_live_orders";
    private static final String CHANNEL_ALERTS = "dashit_order_alerts";
    private static final int NOTIF_ID_LIVE = 9821;
    /* The loud new-order alarm (driver and admin apps): its own channel, so the
       quiet order-update channel above keeps its sound. */
    private static final String CHANNEL_ORDER_ALARM = "dashit_order_alarm";
    private static final int NOTIF_ID_ORDER_ALARM = 9822;
    private static final String EXTRA_STOP_ALARM = "dashit_stop_order_alarm";
    private static final long ORDER_ALARM_MAX_MS = 60_000;
    private MediaPlayer orderAlarmPlayer;
    private int savedAlarmVolume = -1;
    private final Handler alarmHandler = new Handler(Looper.getMainLooper());
    private final Runnable alarmTimeout = () -> stopOrderAlarmNative();
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

                    // Heads-up only: the alarm itself is played below, looping on the alarm stream.
                    NotificationChannel alarmChannel = new NotificationChannel(
                        CHANNEL_ORDER_ALARM,
                        "New order alarm",
                        NotificationManager.IMPORTANCE_HIGH
                    );
                    alarmChannel.setDescription("A loud alarm for each new order, until you tap it");
                    alarmChannel.setShowBadge(true);
                    alarmChannel.setSound(null, null);
                    alarmChannel.enableVibration(false);
                    alarmChannel.setBypassDnd(true);
                    alarmChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
                    manager.createNotificationChannel(alarmChannel);
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
        boolean isDriver = getPackageName().contains("driver");
        
        int appBgColor;
        int navBgColor;
        if (isDriver) {
            appBgColor = Color.parseColor("#0F172A");
            navBgColor = Color.parseColor("#0F172A");
        } else {
            appBgColor = isNightMode ? Color.parseColor("#14171F") : Color.parseColor("#FFE8D6");
            navBgColor = isNightMode ? Color.parseColor("#14171F") : Color.parseColor("#FFFFFF");
        }
        window.setStatusBarColor(appBgColor);
        window.setNavigationBarColor(navBgColor);
        
        WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, window.getDecorView());
        if (insetsController != null) {
            if (isDriver) {
                insetsController.setAppearanceLightStatusBars(false);
                insetsController.setAppearanceLightNavigationBars(false);
            } else {
                insetsController.setAppearanceLightStatusBars(!isNightMode);
                insetsController.setAppearanceLightNavigationBars(!isNightMode);
            }
        }

        int initFlags = 0;
        if (!isDriver && !isNightMode) {
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
            webView.setBackgroundColor(isDriver ? Color.parseColor("#0F172A") : (isNightMode ? Color.parseColor("#14171F") : Color.parseColor("#FFFFFF")));
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
                            boolean lightStatus = isDriver ? false : topDarkIcons;
                            boolean lightNav = isDriver ? false : bottomDarkIcons;
                            if (controller != null) {
                                controller.setAppearanceLightStatusBars(lightStatus);
                                controller.setAppearanceLightNavigationBars(lightNav);
                            }

                            int flags = win.getDecorView().getSystemUiVisibility();
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                if (lightStatus) {
                                    flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                                } else {
                                    flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                                }
                            }
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                if (lightNav) {
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

                /** The loud new-order alarm: loops until stopOrderAlarm(), a tap on its notification, or a minute. */
                @JavascriptInterface
                public void startOrderAlarm(final String title, final String body) {
                    runOnUiThread(() -> startOrderAlarmNative(title, body));
                }

                @JavascriptInterface
                public void stopOrderAlarm() {
                    runOnUiThread(() -> stopOrderAlarmNative());
                }

                @JavascriptInterface
                public boolean isOrderAlarmRinging() {
                    return orderAlarmPlayer != null;
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

    /**
     * Plays the new-order alarm (res/raw/order_alarm.wav) in a loop on the
     * alarm stream, which rings even with the media volume down or the phone
     * on silent, at least 85% loud (the rider's or admin's own alarm volume is
     * put back when it stops), with a strong repeating vibration and a
     * heads-up notification. Stops on stopOrderAlarmNative(), a tap on the
     * notification, or after a minute.
     */
    private void startOrderAlarmNative(String title, String body) {
        stopOrderAlarmNative();
        try {
            AudioManager audio = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (audio != null) {
                int max = audio.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                int now = audio.getStreamVolume(AudioManager.STREAM_ALARM);
                int loud = (int) Math.ceil(max * 0.85);
                if (now < loud) {
                    try {
                        audio.setStreamVolume(AudioManager.STREAM_ALARM, loud, 0);
                        savedAlarmVolume = now;
                    } catch (SecurityException ignored) {
                        // Do Not Disturb can refuse it; the alarm still plays at the set volume.
                    }
                }
            }
            MediaPlayer player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());
            AssetFileDescriptor file = getResources().openRawResourceFd(R.raw.order_alarm);
            player.setDataSource(file.getFileDescriptor(), file.getStartOffset(), file.getLength());
            file.close();
            player.setLooping(true);
            player.prepare();
            player.start();
            orderAlarmPlayer = player;
        } catch (Exception e) {
            orderAlarmPlayer = null;
        }

        try {
            Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = {0, 700, 250, 700, 250, 700, 900};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                } else {
                    vibrator.vibrate(pattern, 0);
                }
            }
        } catch (Exception ignored) {}

        try {
            boolean allowed = Build.VERSION.SDK_INT < 33
                || checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED;
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (allowed && manager != null) {
                createNotificationChannels();
                Intent intent = new Intent(this, MainActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                intent.putExtra(EXTRA_STOP_ALARM, true);
                PendingIntent open = PendingIntent.getActivity(this, 1, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ORDER_ALARM)
                    .setSmallIcon(R.drawable.ic_stat_dashit)
                    .setColor(0xFFFF5B00)
                    .setContentTitle(title != null && !title.isEmpty() ? title : "New order")
                    .setContentText((body != null ? body + " · " : "") + "Tap to silence")
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setOngoing(true)
                    .setAutoCancel(true)
                    .setContentIntent(open);
                manager.notify(NOTIF_ID_ORDER_ALARM, builder.build());
            }
        } catch (Exception ignored) {}

        alarmHandler.postDelayed(alarmTimeout, ORDER_ALARM_MAX_MS);
    }

    private void stopOrderAlarmNative() {
        alarmHandler.removeCallbacks(alarmTimeout);
        if (orderAlarmPlayer != null) {
            try {
                orderAlarmPlayer.stop();
            } catch (Exception ignored) {}
            try {
                orderAlarmPlayer.release();
            } catch (Exception ignored) {}
            orderAlarmPlayer = null;
        }
        try {
            Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null) vibrator.cancel();
        } catch (Exception ignored) {}
        if (savedAlarmVolume >= 0) {
            try {
                AudioManager audio = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                if (audio != null) audio.setStreamVolume(AudioManager.STREAM_ALARM, savedAlarmVolume, 0);
            } catch (Exception ignored) {}
            savedAlarmVolume = -1;
        }
        try {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) manager.cancel(NOTIF_ID_ORDER_ALARM);
        } catch (Exception ignored) {}
    }

    /** A tap on the alarm's notification opens the app and silences the alarm. */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent != null && intent.getBooleanExtra(EXTRA_STOP_ALARM, false)) {
            stopOrderAlarmNative();
        }
    }

    @Override
    public void onDestroy() {
        stopOrderAlarmNative();
        super.onDestroy();
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

