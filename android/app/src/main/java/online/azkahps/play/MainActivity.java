package online.azkahps.play;

import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

import java.io.File;

public class MainActivity extends BridgeActivity {

    private FullscreenChromeClient chromeClient;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Capacitor's stock chrome client hides fullscreen video custom views.
        // Swap in ours so native <video> fullscreen works, and lock the activity
        // to landscape while a video is fullscreen.
        Bridge bridge = getBridge();
        if (bridge != null && bridge.getWebView() != null) {
            chromeClient = new FullscreenChromeClient(bridge);
            bridge.getWebView().setWebChromeClient(chromeClient);

            // OTA updates: the web layer downloads the APK into the app cache,
            // then calls window.ChikaraInstaller.installApk(fileName) to open
            // the system installer.
            bridge.getWebView().addJavascriptInterface(new InstallerBridge(this), "ChikaraInstaller");
        }
    }

    /** Bridge for OTA APK installs (invoked from the web layer). */
    private static class InstallerBridge {

        private final MainActivity activity;

        InstallerBridge(MainActivity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public void installApk(String fileName) {
            activity.runOnUiThread(() -> activity.openInstaller(fileName));
        }
    }

    private void openInstaller(String fileName) {
        try {
            File apk = new File(getCacheDir(), fileName);
            if (!apk.exists()) return;

            // Android 8+: the user must allow installs from this app first.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    && !getPackageManager().canRequestPackageInstalls()) {
                Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                settings.setData(Uri.parse("package:" + getPackageName()));
                startActivity(settings);
                Toast.makeText(
                        this,
                        "Izinkan pemasangan dari Chikara Stream, lalu tekan tombol update lagi.",
                        Toast.LENGTH_LONG).show();
                return;
            }

            Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", apk);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (Exception ignored) {
            // the user can simply retry from the update banner
        }
    }

    @Override
    public void onBackPressed() {
        // Back while a video is fullscreen should exit fullscreen, not the app.
        if (chromeClient != null && chromeClient.isFullscreen()) {
            chromeClient.exitFullscreen();
            return;
        }
        super.onBackPressed();
    }

    /** Hosts fullscreen video custom views and locks landscape while active. */
    private class FullscreenChromeClient extends BridgeWebChromeClient {

        private View customView;
        private WebChromeClient.CustomViewCallback callback;

        FullscreenChromeClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public void onShowCustomView(View view, CustomViewCallback viewCallback) {
            if (customView != null) {
                viewCallback.onCustomViewHidden();
                return;
            }
            customView = view;
            callback = viewCallback;

            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);

            ViewGroup root = findViewById(android.R.id.content);
            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT);
            root.addView(view, params);
        }

        @Override
        public void onHideCustomView() {
            exitFullscreen();
        }

        boolean isFullscreen() {
            return customView != null;
        }

        void exitFullscreen() {
            if (customView == null) return;
            View view = customView;
            WebChromeClient.CustomViewCallback cb = callback;
            customView = null;
            callback = null;

            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);

            ViewGroup root = findViewById(android.R.id.content);
            root.removeView(view);

            if (cb != null) {
                cb.onCustomViewHidden();
            }
        }
    }
}
