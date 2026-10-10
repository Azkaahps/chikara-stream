#!/usr/bin/env bash
# Build a signed release APK and publish it for OTA updates:
#   1. build (icons -> tsc -> vite -> cap sync -> gradle release)
#   2. upload APK to Google Drive (same file name -> share id stays stable)
#   3. refresh version.json so installed apps see the new version
#
# Usage: bash scripts/publish.sh ["catatan rilis"]
set -e
cd "$(dirname "$0")/.."

NOTES="${1:-Perbaikan bug dan peningkatan performa.}"

# Version comes from the single source of truth (build.gradle)
VERSION_CODE=$(grep -oE 'versionCode +[0-9]+' android/app/build.gradle | grep -oE '[0-9]+')
VERSION_NAME=$(grep -oE 'versionName +"[^"]+"' android/app/build.gradle | grep -oE '[0-9.]+')

echo "==> Publishing Chikara Stream v${VERSION_NAME} (code ${VERSION_CODE})"

# 1) Build
bash scripts/build_apk.sh

# 2) Upload APK (stable id: replacing the same file keeps the download link)
echo "==> Uploading APK to Google Drive"
scp -q Chikara-Stream.apk laptop2:/tmp/Chikara-Stream.apk
ssh laptop2 '~/.local/bin/rclone copyto /tmp/Chikara-Stream.apk "gdrive:ChikaraStream/Chikara-Stream.apk" 2>/dev/null'
ssh laptop2 'rm -f /tmp/Chikara-Stream.apk'

# 3) Refresh version.json (generated + validated via python so notes with
#    quotes/unicode can never break the manifest)
mkdir -p .tmp
python - "$VERSION_CODE" "$VERSION_NAME" "$NOTES" <<'PYEOF'
import json, sys

code, name, notes = sys.argv[1], sys.argv[2], sys.argv[3]
manifest = {
    "versionCode": int(code),
    "versionName": name,
    "notes": notes,
    "apkUrl": (
        "https://drive.usercontent.google.com/download"
        "?id=1QXF53-gwaC9Z4RMkzzqmDR11CDId81hm&export=download&confirm=t"
    ),
}
with open(".tmp/version.json", "w", encoding="utf-8", newline="\n") as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)
    f.write("\n")
print("manifest ok:", manifest["versionCode"], manifest["versionName"])
PYEOF
scp -q .tmp/version.json laptop2:/tmp/chikara-version.json
ssh laptop2 '~/.local/bin/rclone copyto /tmp/chikara-version.json "gdrive:ChikaraStream/version.json" 2>/dev/null'
ssh laptop2 'rm -f /tmp/chikara-version.json'

echo ""
echo "PUBLISHED v${VERSION_NAME} (code ${VERSION_CODE})"
echo "  APK:      gdrive:ChikaraStream/Chikara-Stream.apk"
echo "  Manifest: gdrive:ChikaraStream/version.json"
echo "  Installed apps will offer the update on next launch."
