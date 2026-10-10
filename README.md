# Chikara Stream

Aplikasi mobile nonton **anime + film jadi satu** - dibangun dengan React 19 + Vite + Tailwind 4, dibungkus Capacitor 8 jadi APK Android.

## Fitur

- **Loading screen** - splash brand dengan prefetch data beranda (buka app -> beranda langsung terisi)
- **Beranda** - featured carousel, lanjut nonton, rail anime update + film terbaru + top bulan + drakor
- **Film** - katalog LK21 dengan filter genre + pagination
- **Anime** - katalog Kuramanime (Update / Ongoing / Movie)
- **Cari** - pencarian gabungan anime + film (debounced)
- **Simpan** - watchlist + riwayat nonton (lokal, tanpa login)
- **Detail** - hero poster, rating, sinopsis, cast (film) / daftar episode (anime)
- **Player** - MP4 (anime kuramadrive, hydrax) + HLS (cast/p2p) via proxy API, pemilih kualitas, failover server otomatis, resume posisi nonton, **fullscreen landscape**

## Optimasi (HP kentang)

- hls.js di-lazy-load (hanya saat server movie HLS dipakai) dan pakai build `light`
- Cache API in-memory (5 menit) + persist feed beranda ke localStorage -> buka app instan / tetap jalan saat sinyal jelek
- Buffer HLS dibatasi (memory kecil)
- Animasi hanya transform/opacity; `backdrop-blur` dihapus dari UI
- `content-visibility: auto` untuk rail di luar layar
- Gambar poster lazy + async decode

## Arsitektur

```
src/
|-- lib/
|   |-- api.ts       # client api.azkahps.online (anime + movie + proxy)
|   |-- types.ts     # tipe API + model lokal
|   |-- player.ts    # resolusi stream + hook useVideoPlayback (HLS/MP4)
|   |-- store.ts     # watchlist + progress (localStorage)
|   |-- hooks.ts     # useAsync, useDebounced
|   `-- native.ts    # status bar + back button (Capacitor)
|-- components/      # TitleCard, Rail, TopBar, TabBar, VideoPlayer, Skeleton
`-- screens/         # Home, Movies, Anime, Search, Library, *Detail, *Watch, GenreResults
```

Stream playback selalu lewat proxy `api.azkahps.online/api/v1/proxy/*` (CORS + referer upstream ditangani server).

## Build APK

```bash
# sekali setup
npm install
npx cap add android   # sudah dilakukan

# build
bash scripts/build_apk.sh
# output: Chikara-Stream.apk
```

Prasyarat: JDK 17+, Android SDK (compileSdk 36), Gradle 8.14 (via wrapper).

## Dev (browser)

```bash
npm run dev
```

## Design

Mengadaptasi design language AniBiPlay (design-lab/06-anibiplay-mobile): hitam pekat, aksen kuning #FFC928, radius besar, eyebrow uppercase, poster-forward, bottom nav pill melayang.
