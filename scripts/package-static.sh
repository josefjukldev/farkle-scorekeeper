#!/usr/bin/env bash
# Builds the app and zips the CONTENTS of dist/ (index.html at the zip root) for static hosts such as tiiny.host.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
mkdir -p deploy
rm -f deploy/dices-with-friends-static.zip
(cd dist && zip -r -X ../deploy/dices-with-friends-static.zip . -x '*.map')
echo "Created deploy/dices-with-friends-static.zip"
unzip -l deploy/dices-with-friends-static.zip | tail -15
