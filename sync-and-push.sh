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
TARGET_BRANCH=native-swift-ios
IOS_PATHS="ios-swift/ docs/SWIFT_IOS_MIGRATION_PLAN.md .github/workflows/ios-swift-build.yml sync-and-push.sh"
CURRENT_BRANCH=$(git branch --show-current)

if [ "$CURRENT_BRANCH" = "$TARGET_BRANCH" ]; then
  git add $IOS_PATHS 2>/dev/null || true
  if ! git diff --cached --quiet; then
    git commit -m "$COMMIT_MSG"
  fi
else
  # Another branch is checked out in this folder (e.g. a parallel Android
  # session). Commit the iOS paths straight onto native-swift-ios through a
  # scratch index, leaving the checked-out branch, its index and the working
  # tree exactly as they are.
  echo "Checked-out branch is '$CURRENT_BRANCH'; committing iOS paths to $TARGET_BRANCH without switching."
  SCRATCH_INDEX=$(mktemp)
  rm -f "$SCRATCH_INDEX"
  GIT_INDEX_FILE="$SCRATCH_INDEX" git read-tree "$TARGET_BRANCH"
  GIT_INDEX_FILE="$SCRATCH_INDEX" git add $IOS_PATHS 2>/dev/null || true
  NEW_TREE=$(GIT_INDEX_FILE="$SCRATCH_INDEX" git write-tree)
  rm -f "$SCRATCH_INDEX"
  if [ "$NEW_TREE" != "$(git rev-parse "$TARGET_BRANCH^{tree}")" ]; then
    NEW_COMMIT=$(git commit-tree "$NEW_TREE" -p "$TARGET_BRANCH" -m "$COMMIT_MSG")
    git update-ref "refs/heads/$TARGET_BRANCH" "$NEW_COMMIT"
    echo "Committed $NEW_COMMIT on $TARGET_BRANCH"
  fi
fi
git push origin "$TARGET_BRANCH"

echo "=== 3. Pushing to stiencoder/dashit (branch: main) ==="
cd /home/aleemkanyu/Projects/dashit-ios
git add .
if ! git diff --cached --quiet; then
  git commit -m "$COMMIT_MSG"
fi
git push origin main

echo "=== All changes pushed to both GitHub accounts successfully! ==="
