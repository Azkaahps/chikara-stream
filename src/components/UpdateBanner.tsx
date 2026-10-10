// UpdateBanner - shows when a newer build is published; one-tap download + install.

import { useEffect, useState } from 'react';
import { Download, Loader2, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { checkForUpdate, downloadUpdate, installUpdate, type UpdateInfo } from '../lib/updater';

type Phase = 'idle' | 'downloading' | 'ready' | 'error';

export default function UpdateBanner() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [pct, setPct] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let alive = true;
    checkForUpdate().then((u) => {
      if (alive && u) setInfo(u);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!info || hidden) return null;

  const start = async () => {
    if (phase === 'ready') {
      installUpdate();
      return;
    }
    setPhase('downloading');
    setPct(0);
    const ok = await downloadUpdate(info.apkUrl, setPct);
    if (ok) {
      setPhase('ready');
      installUpdate();
    } else {
      setPhase('error');
    }
  };

  const status =
    phase === 'downloading'
      ? pct > 0
        ? `Mengunduh... ${pct}%`
        : 'Mengunduh...'
      : phase === 'ready'
        ? 'Unduhan selesai - lanjutkan pemasangan di dialog sistem.'
        : phase === 'error'
          ? 'Gagal mengunduh. Periksa koneksi lalu coba lagi.'
          : info.notes || 'Pembaruan aplikasi siap dipasang.';

  return (
    <div className="mx-4 mt-4 rounded-[18px] bg-card p-3.5 ring-1 ring-line-2">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-black">
          {phase === 'downloading' ? (
            <Loader2 size={17} className="animate-spin" />
          ) : phase === 'ready' ? (
            <CheckCircle2 size={17} />
          ) : phase === 'error' ? (
            <AlertTriangle size={17} />
          ) : (
            <Download size={17} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold text-fg">
            Versi {info.versionName} tersedia
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-fg-3">{status}</p>

          {phase === 'downloading' ? (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-card-2">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-200"
                style={{ width: `${pct}%` }}
              />
            </div>
          ) : (
            <button
              onClick={start}
              className="pressable mt-2.5 rounded-full bg-accent px-4 py-1.5 text-[12px] font-bold text-black"
            >
              {phase === 'ready'
                ? 'Buka penginstal'
                : phase === 'error'
                  ? 'Coba lagi'
                  : 'Update sekarang'}
            </button>
          )}
        </div>

        {phase !== 'downloading' && (
          <button
            onClick={() => setHidden(true)}
            aria-label="Tutup"
            className="pressable grid h-6 w-6 shrink-0 place-items-center rounded-full bg-card-2 text-fg-3"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
