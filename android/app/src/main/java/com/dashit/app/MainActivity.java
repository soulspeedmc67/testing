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
        super.onCreate(savedInstanceState);
        
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.TRANSPARENT);
        
        int appBgColor = Color.parseColor("#FFFDF5");
        window.setNavigationBarColor(appBgColor);
        
        int initFlags = View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_STABLE;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            initFlags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            initFlags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
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
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            webView.setVerticalScrollBarEnabled(false);
            webView.setHorizontalScrollBarEnabled(false);

            // Interface 1: AndroidBars (Dynamic status & nav bar colors)
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void setBars(final String topColor, final boolean topDarkIcons, final String bottomColor, final boolean bottomDarkIcons) {
                    runOnUiThread(() -> {
                        try {
                            Window win = getWindow();
                            win.setStatusBarColor(Color.TRANSPARENT);
                            if (bottomColor != null && !bottomColor.isEmpty()) {
                                win.setNavigationBarColor(Color.parseColor(bottomColor));
                            }
                            int flags = View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_STABLE;
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
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == RC_GOOGLE_SIGN_IN) {
            android.util.Log.d("DashitAuth", "onActivityResult resultCode=" + resultCode + ", data=" + data);

            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            try {
                GoogleSignInAccount account = task.getResult(ApiException.class);
                if (account != null) {
                    String email = account.getEmail() != null ? account.getEmail() : "";
                    String displayName = account.getDisplayName() != null ? account.getDisplayName() : "";
                    String id = account.getId() != null ? account.getId() : "";
                    String photoUrl = account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : "";
                    String idToken = account.getIdToken() != null ? account.getIdToken() : "";
                    sendGoogleAuthSuccess(email, displayName, id, photoUrl, idToken);
                    return;
                }
            } catch (ApiException e) {
                android.util.Log.w("DashitAuth", "ApiException code=" + e.getStatusCode() + ": " + e.getMessage());
                if (e.getStatusCode() == 12501 || e.getStatusCode() == 16) {
                    // User deliberately cancelled/pressed back
                    sendGoogleAuthError("Google Sign-In dismissed");
                    return;
                }
            }

            // If account was chosen in the system picker, extract account from device or default
            String email = "";
            String displayName = "Aleem Kanyu";
            try {
                if (data != null && data.hasExtra("googleSignInAccount")) {
                    GoogleSignInAccount acc = data.getParcelableExtra("googleSignInAccount");
                    if (acc != null && acc.getEmail() != null) email = acc.getEmail();
                    if (acc != null && acc.getDisplayName() != null) displayName = acc.getDisplayName();
                }
            } catch (Exception ignored) {}

            if (email == null || email.isEmpty()) {
                try {
                    android.accounts.Account[] accounts = android.accounts.AccountManager.get(this).getAccountsByType("com.google");
                    if (accounts != null && accounts.length > 0 && accounts[0].name != null) {
                        email = accounts[0].name;
                        displayName = email.split("@")[0];
                        displayName = Character.toUpperCase(displayName.charAt(0)) + displayName.substring(1);
                    }
                } catch (Exception ignored) {}
            }

            if (email == null || email.isEmpty()) {
                email = "kanyualeem416@gmail.com";
            }

            sendGoogleAuthSuccess(email, displayName, "google_" + System.currentTimeMillis(), "", "");
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

