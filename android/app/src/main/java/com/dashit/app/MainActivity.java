package com.dashit.app;

import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final int RC_GOOGLE_SIGN_IN = 9001;
    private GoogleSignInClient mGoogleSignInClient;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        androidx.core.splashscreen.SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        
        int appBgColor = Color.parseColor("#FFE8D6");
        window.setStatusBarColor(appBgColor);
        
        int navBgColor = Color.parseColor("#FFFDF5");
        window.setNavigationBarColor(navBgColor);
        
        int initFlags = 0;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            initFlags = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            initFlags = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
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
            webView.setBackgroundColor(Color.parseColor("#FFFFFF"));
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
                            if (topColor != null && !topColor.isEmpty() && !topColor.equals("#00000000")) {
                                win.setStatusBarColor(Color.parseColor(topColor));
                            }
                            if (bottomColor != null && !bottomColor.isEmpty()) {
                                win.setNavigationBarColor(Color.parseColor(bottomColor));
                            }
                            int flags = 0;
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && topDarkIcons) {
                                flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                            }
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && bottomDarkIcons) {
                                flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
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
        }
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

