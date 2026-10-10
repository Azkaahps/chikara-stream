// Native shell integration: dark status bar, Android back button,
// and screen-orientation helpers for fullscreen video (landscape).
// Safe to import in web preview - all calls are guarded.

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/** Lock to landscape (used while video is fullscreen). */
export async function lockLandscape(): Promise<void> {
  try {
    const { ScreenOrientation } = await import('@capacitor/screen-orientation');
    await ScreenOrientation.lock({ orientation: 'landscape' });
  } catch {
    /* web preview / plugin unavailable */
  }
}

/** Release the orientation lock (back to device default). */
export async function unlockOrientation(): Promise<void> {
  try {
    const { ScreenOrientation } = await import('@capacitor/screen-orientation');
    await ScreenOrientation.unlock();
  } catch {
    /* web preview / plugin unavailable */
  }
}

export function useNativeShell() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cleanupFns: (() => void)[] = [];

    (async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#000000' });
        await StatusBar.setOverlaysWebView({ overlay: true });
      } catch {
        /* plugin unavailable */
      }

      try {
        const { App: CapApp } = await import('@capacitor/app');
        const listener = await CapApp.addListener('backButton', ({ canGoBack }) => {
          const hash = window.location.hash.replace(/^#/, '');
          const isRoot = hash === '' || hash === '/';
          if (canGoBack && !isRoot) {
            window.history.back();
          } else {
            CapApp.exitApp();
          }
        });
        cleanupFns.push(() => listener.remove());
      } catch {
        /* plugin unavailable */
      }
    })();

    return () => {
      cleanupFns.forEach((fn) => fn());
      cleanupFns = [];
    };
  }, []);
}
