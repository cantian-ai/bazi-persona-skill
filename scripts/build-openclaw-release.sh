#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
RELEASE_DIR="$ROOT_DIR/release/bazi-persona-skill"

cd "$ROOT_DIR"

echo "Building dist..."
npm run build

echo "Preparing OpenClaw release folder..."
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

cp package.json "$RELEASE_DIR/"
cp SKILL.md "$RELEASE_DIR/"
cp README.md "$RELEASE_DIR/"
cp README.en.md "$RELEASE_DIR/"
cp README.ja.md "$RELEASE_DIR/"
cp README.ko.md "$RELEASE_DIR/"
cp README.zh-TW.md "$RELEASE_DIR/"
cp -R bin "$RELEASE_DIR/"
cp -R dist "$RELEASE_DIR/"
cp -R prompts "$RELEASE_DIR/"

echo "Done: $RELEASE_DIR"
