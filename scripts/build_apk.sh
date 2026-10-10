#!/usr/bin/env bash
# Full pipeline: icons/splash -> web build -> capacitor sync -> gradle assembleRelease (signed)
set -e
cd "$(dirname "$0")/.."

echo "==> [1/5] Generate icons + splash"
python scripts/make_icons.py > /dev/null
python scripts/make_splash.py > /dev/null

echo "==> [2/5] TypeScript check"
npx tsc --noEmit

echo "==> [3/5] Vite build"
npm run build

echo "==> [4/5] Capacitor sync android"
npx cap sync android

echo "==> [5/5] Gradle assembleRelease"
cd android
./gradlew.bat assembleRelease

APK="app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK" ]; then
  cp "$APK" "../Chikara-Stream.apk"
  echo ""
  echo "BUILD OK -> $(cd .. && pwd)/Chikara-Stream.apk"
  ls -lh "../Chikara-Stream.apk"
else
  echo "BUILD FAILED - APK not found"
  exit 1
fi
