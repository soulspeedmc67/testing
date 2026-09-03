#!/bin/bash
set -e

echo "=== 1. Cleaning Cache & Building Next.js Web App ==="
rm -rf .next out
npx next build

echo "=== 2. Preparing Static Web Assets for Capacitor ==="
mkdir -p out
cp -r .next/server/pages/* out/ 2>/dev/null || true
cp -r public/* out/ 2>/dev/null || true
if [ -d ".next/static" ]; then
  mkdir -p out/_next
  cp -r .next/static out/_next/
fi

echo "=== 3. Syncing Capacitor Android ==="
npx cap copy android
npx cap sync android

echo "=== 4. Compiling Android APK ==="
export JAVA_HOME="/home/aleemkanyu/.local/share/developer-tools/jdk-21.0.2+13"
export ANDROID_HOME="${ANDROID_HOME:-/home/aleemkanyu/Android/Sdk}"
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH

cd android
./gradlew clean assembleDebug

echo "=== 5. Installing Fresh APK on Device ==="
cd ..
cp -f android/app/build/outputs/apk/debug/app-debug.apk dashit-debug.apk || true
adb devices
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

echo "=== SUCCESS! Fresh App Installed on Android Device ==="
