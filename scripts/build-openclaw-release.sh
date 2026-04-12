#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
OPENCLAW_DIR="$ROOT_DIR/openclaw"
RELEASE_ROOT="$ROOT_DIR/release/openclaw"
RELEASE_DIR="$RELEASE_ROOT/bazi-persona"

cd "$ROOT_DIR"

echo "Building dist..."
npm run build

echo "Preparing OpenClaw release folder..."
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

cp "$OPENCLAW_DIR/SKILL.md" "$RELEASE_DIR/SKILL.md"
cp "$OPENCLAW_DIR/README.md" "$RELEASE_DIR/README.md"
cp -R dist "$RELEASE_DIR/"
cp -R prompts "$RELEASE_DIR/"

node -e 'const fs=require("fs"); const path=require("path"); const rootDir=process.argv[1]; const releaseDir=process.argv[2]; const pkg=JSON.parse(fs.readFileSync(path.join(rootDir,"package.json"),"utf8")); const out={name:"bazi-persona",version:pkg.version,private:true,description:"OpenClaw runtime package for Bazi Persona",type:pkg.type,main:pkg.main,types:pkg.types,exports:pkg.exports,engines:pkg.engines,homepage:"https://clawhub.ai/xiaojxiao2021/bazi-persona",repository:pkg.repository,license:pkg.license,keywords:["openclaw","bazi","persona"],scripts:{bazi:"node dist/cli.js"},dependencies:pkg.dependencies}; fs.writeFileSync(path.join(releaseDir,"package.json"), JSON.stringify(out,null,2)+"\n");' "$ROOT_DIR" "$RELEASE_DIR"

echo "Done: $RELEASE_DIR"
