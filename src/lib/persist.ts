// Native-backed storage guard.
// Android can drop WebView localStorage between builds (app updates,
// storage pressure, OS cleanups). Every store write is mirrored to
// @capacitor/preferences (SharedPreferences in the app's private files)
// and restored on launch when localStorage comes back empty, so watch
// history and saved titles survive updates.
import { Preferences } from '@capacitor/preferences';

const BACKUP_PREFIX = 'chikara:bak:';

/** Keys whose writes get mirrored + restored. */
export const BACKED_UP_KEYS = [
  'chikara:watchlist:v1',
  'chikara:progress:v1',
  'chikara:searches:v1',
];

function isNative(): boolean {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

/** Mirror one localStorage write into native storage (best effort). */
export function mirror(key: string, raw: string) {
  if (!isNative()) return;
  Preferences.set({
    key: BACKUP_PREFIX + key,
    value: JSON.stringify({ t: Date.now(), v: raw }),
  }).catch(() => undefined);
}

/** Restore any backed-up key whose localStorage copy is missing. */
export async function bootstrapBackup() {
  if (!isNative()) return;
  await Promise.allSettled(
    BACKED_UP_KEYS.map(async (key) => {
      try {
        const { value } = await Preferences.get({ key: BACKUP_PREFIX + key });
        if (!value) return;
        const bak = JSON.parse(value) as { t?: number; v?: string };
        if (typeof bak?.v !== 'string') return;
        if (!localStorage.getItem(key)) localStorage.setItem(key, bak.v);
      } catch {
        /* storage is best-effort - never block the app */
      }
    }),
  );
}
