#!/bin/bash
set -e

COMMIT_MSG="${1:-Update native Swift iOS app}"

echo "=== 1. Syncing changes from Blinkit/ios-swift to dashit-ios ==="
mkdir -p /home/aleemkanyu/Projects/dashit-ios/DASHit
mkdir -p /home/aleemkanyu/Projects/dashit-ios/DASHitWidgets

rsync -av --delete \
  --exclude=".*" \
  --exclude="build" \
  /home/aleemkanyu/Projects/Blinkit/ios-swift/DASHit/ /home/aleemkanyu/Projects/dashit-ios/DASHit/

rsync -av --delete \
  --exclude=".*" \
  /home/aleemkanyu/Projects/Blinkit/ios-swift/DASHitWidgets/ /home/aleemkanyu/Projects/dashit-ios/DASHitWidgets/

cp /home/aleemkanyu/Projects/Blinkit/ios-swift/project.yml /home/aleemkanyu/Projects/dashit-ios/project.yml
cp /home/aleemkanyu/Projects/Blinkit/ios-swift/Package.swift /home/aleemkanyu/Projects/dashit-ios/Package.swift

echo "=== 2. Pushing to AleemKanyu/dashit (branch: native-swift-ios) ==="
cd /home/aleemkanyu/Projects/Blinkit
git add ios-swift/ docs/SWIFT_IOS_MIGRATION_PLAN.md .github/workflows/ios-swift-build.yml sync-and-push.sh 2>/dev/null || true
if ! git diff --cached --quiet; then
  git commit -m "$COMMIT_MSG"
fi
git push origin native-swift-ios

echo "=== 3. Pushing to stiencoder/dashit (branch: main) ==="
cd /home/aleemkanyu/Projects/dashit-ios
git add .
if ! git diff --cached --quiet; then
  git commit -m "$COMMIT_MSG"
fi
git push origin main

echo "=== All changes pushed to both GitHub accounts successfully! ==="
