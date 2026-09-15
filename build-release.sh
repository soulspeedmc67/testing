#!/bin/bash
#
# Produces the signed Android App Bundles Google Play requires.
#
# build-app.sh is the device script — it makes a debug APK and installs it on the
# Pixel. Play has not accepted APKs for new apps since August 2021; it wants an
# .aab, and it wants it signed with an upload key. This script does that for all
# three flavours.
#
# One-time setup, before the first run:
#
#   1. Create an upload keystore (keep the file and the passwords safe — losing
#      them means you can never update the app again):
#
#        keytool -genkeypair -v -keystore dashit-upload.jks \
#          -keyalg RSA -keysize 2048 -validity 10000 -alias dashit
#
#   2. Put the credentials in android/keystore.properties (git-ignored):
#
#        storeFile=/absolute/path/to/dashit-upload.jks
#        storePassword=...
#        keyAlias=dashit
#        keyPassword=...
#
# Then: ./build-release.sh
#
set -e

echo "=== 1. Building the web bundle ==="
rm -rf .next out
npx next build

echo "=== 2. Syncing Capacitor ==="
npx cap sync android

echo "=== 3. Building signed App Bundles ==="
export JAVA_HOME="${JAVA_HOME:-/home/aleemkanyu/.local/share/developer-tools/jdk-21.0.2+13}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

if [ ! -f android/keystore.properties ]; then
  echo
  echo "  android/keystore.properties is missing."
  echo "  Without it Gradle produces an UNSIGNED bundle, which Play will reject."
  echo "  See the header of this script for how to create it."
  echo
  exit 1
fi

cd android
./gradlew clean bundleCustomerRelease bundleAdminRelease bundleDriverRelease
cd ..

echo "=== 4. Collecting bundles ==="
mkdir -p release
find android/app/build/outputs/bundle -name "*.aab" -exec cp -v {} release/ \;

echo
echo "Done. Upload these to the Play Console:"
ls -lh release/*.aab
echo
echo "Reminder: only the customer bundle belongs on the public Play listing."
echo "The admin and rider bundles are for internal distribution (internal"
echo "testing track or direct install) — a store console has no place on a"
echo "consumer listing and will be rejected under Minimum Functionality."
