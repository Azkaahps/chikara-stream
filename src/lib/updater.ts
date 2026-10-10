// Update checker - polls the published version.json (Google Drive) on launch
// and offers a one-tap install when a newer build is available.
//
// Everything goes through the native Filesystem plugin (HttpURLConnection),
// so Google Drive CORS quirks never apply inside the WebView.
//
// Android does not allow silent APK installs for sideloaded apps, so the flow is:
//   check -> download to app cache (with progress) -> system install prompt.
//
// The Drive file ids below are stable across replacements, so these URLs never
// change between builds. Publish with `bash scripts/publish.sh`.

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';

export interface UpdateInfo {
  versionCode: number;
  versionName: string;
  notes?: string;
  apkUrl: string;
}

const VERSION_URL =
  'https://drive.usercontent.google.com/download?id=1GBrMi4kYfdH84dI27HOitXSMZze_WzQl&export=download&confirm=t';

const APK_FILE = 'chikara-update.apk';
const MANIFEST_FILE = 'chikara-version.json';

declare global {
  interface Window {
    ChikaraInstaller?: { installApk: (fileName: string) => void };
  }
}

/** Returns update info when a newer build is published, else null. */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    // Native download (no CORS on the WebView path).
    const res = await Filesystem.downloadFile({
      url: `${VERSION_URL}&t=${Date.now()}`,
      path: MANIFEST_FILE,
      directory: Directory.Cache,
    });
    if (!res.path) return null;

    const file = await Filesystem.readFile({
      path: MANIFEST_FILE,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    const raw = typeof file.data === 'string' ? file.data : await (file.data as Blob).text();
    const remote = JSON.parse(raw) as UpdateInfo;
    if (!remote || typeof remote.versionCode !== 'number' || !remote.apkUrl) return null;

    const local = await App.getInfo();
    const localCode = Number.parseInt(local.build, 10) || 0;
    return remote.versionCode > localCode ? remote : null;
  } catch {
    return null; // offline / blocked -> silently skip
  }
}

/** Downloads the APK to the app cache and reports 0-100 progress. */
export async function downloadUpdate(
  url: string,
  onProgress?: (pct: number) => void,
): Promise<boolean> {
  let listener: { remove: () => void } | undefined;
  try {
    if (onProgress) {
      listener = await Filesystem.addListener('progress', (p) => {
        if (p.contentLength > 0) {
          onProgress(Math.min(100, Math.round((p.bytes / p.contentLength) * 100)));
        }
      });
    }
    await Filesystem.downloadFile({
      url,
      path: APK_FILE,
      directory: Directory.Cache,
      progress: true,
    });
    return true;
  } catch {
    return false;
  } finally {
    listener?.remove();
  }
}

/** Hands the downloaded APK to the native installer. */
export function installUpdate(): boolean {
  const bridge = window.ChikaraInstaller;
  if (!bridge?.installApk) return false;
  bridge.installApk(APK_FILE);
  return true;
}
