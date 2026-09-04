package com.dashit.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
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

        if (this.bridge != null && this.bridge.getWebView() != null) {
            android.webkit.WebView webView = this.bridge.getWebView();
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            webView.setVerticalScrollBarEnabled(false);
            webView.setHorizontalScrollBarEnabled(false);

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
        }
    }
}
