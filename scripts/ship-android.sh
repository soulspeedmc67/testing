#!/bin/bash
# Builds the signed Android release (APK for the website, AAB for Google Play) and puts the
# APK inside the website upload zip, so one upload updates everything.
#
#   APP_STORE_GUARD_OK=1 bash scripts/ship-android.sh
#
# The owner's compliance guard blocks release builds while it reports critical flags;
# APP_STORE_GUARD_OK=1 is the owner's decision to build anyway (the three flags it raises for
# this app are the website's emulator host, Razorpay for physical goods, and a Google Play
# Billing rule that doesn't apply to groceries).
#
# Gives you, in the project folder:
#   dashit-hostinger-deploy.zip   the website, with DASHit.apk at its root
#   DASHit-release.aab            upload this to Google Play
#   DASHit.apk                    the same APK, for installing by hand
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "Building the signed Android release (APK and AAB)..."
(cd android-compose && ./gradlew :app:assembleRelease :app:bundleRelease)

APK=android-compose/app/build/outputs/apk/release/app-release.apk
AAB=android-compose/app/build/outputs/bundle/release/app-release.aab
if [ ! -f "$APK" ]; then
  echo "No signed APK was built (is android/keystore.properties there?)." >&2
  exit 1
fi
if [ ! -f "$AAB" ]; then
  echo "No AAB was built." >&2
  exit 1
fi

cp "$APK" DASHit.apk
cp "$AAB" DASHit-release.aab

echo "Building the website zip..."
npm run export:zip
zip -q -j dashit-hostinger-deploy.zip DASHit.apk

echo
echo "Done."
ls -la dashit-hostinger-deploy.zip DASHit.apk DASHit-release.aab
unzip -l dashit-hostinger-deploy.zip | grep -E " DASHit.apk$| index.html$" | head -3
