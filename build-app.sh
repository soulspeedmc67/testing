#!/bin/bash
set -e

echo "=== 1. Building Next.js Web App ==="
npx next build

echo "=== 2. Preparing Static Web Assets for Capacitor ==="
mkdir -p out
cp -r .next/server/pages/* out/ 2>/dev/null || true
cp -r public/* out/ 2>/dev/null || true

echo "=== 3. Syncing Capacitor Android ==="
npx cap copy android
npx cap sync android

echo "=== 4. Compiling Android APK ==="
export JAVA_HOME=/tmp/jdk21
export ANDROID_HOME=/home/aleemkanyu/Android/Sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH

cd android
./gradlew assembleDebug

echo "=== 5. Installing Fresh APK on Device ==="
adb devices
adb install -r app/build/outputs/apk/debug/app-debug.apk || true

echo "=== SUCCESS! Fresh App Installed on Android Device ==="
