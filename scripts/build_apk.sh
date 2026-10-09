#!/usr/bin/env bash
# Full pipeline: web build -> capacitor sync -> gradle assembleRelease (signed)
set -e
cd "$(dirname "$0")/.."

echo "==> [1/4] TypeScript check"
npx tsc --noEmit

echo "==> [2/4] Vite build"
npm run build

echo "==> [3/4] Capacitor sync android"
npx cap sync android

echo "==> [4/4] Gradle assembleRelease"
cd android
./gradlew.bat assembleRelease

APK="app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK" ]; then
  cp "$APK" "../AZKAHPS-Play.apk"
  echo ""
  echo "BUILD OK -> $(cd .. && pwd)/AZKAHPS-Play.apk"
  ls -lh "../AZKAHPS-Play.apk"
else
  echo "BUILD FAILED - APK not found"
  exit 1
fi
