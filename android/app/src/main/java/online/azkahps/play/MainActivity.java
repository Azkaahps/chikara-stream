package online.azkahps.play;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.widget.FrameLayout;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

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
