# Command reference only. Copy individual commands from the project root.
# Use the repository's Node version and locked Yarn dependencies.
# Windows PowerShell: set $env:NODE_OPTIONS='--openssl-legacy-provider' first.
export NODE_OPTIONS=--openssl-legacy-provider
yarn install --frozen-lockfile

# Development and local HTTPS.
yarn dev
yarn dev:ssl

# Unit tests and the focused Save/slideshow regression set.
yarn test --runInBand
yarn test --runInBand __tests__/utils/monacoSave.spec.tsx __tests__/utils/slideshow.spec.ts __tests__/utils/wallpaperFallback.spec.ts __tests__/utils/sessionPersistence.spec.tsx

# Real BrowserFS IndexedDB fixtures; these do not replace app integration.
yarn playwright test --config=playwright.welcome.config.js

# Existing browser suites and interactive runner (requires a served app).
yarn e2e
yarn e2e:ui

# Quality checks; formatting/style commands may change files.
yarn lint
yarn prettier
yarn stylelint

# Generate indexes, build the static app and serve the output.
yarn build:prebuild
yarn build
yarn serve

# Real Save + slideshow + early-boot + complete browser-process restart acceptance.
# Point at the intended local or deployed app. This creates a new disposable
# profile inside the output directory and removes only that profile after use.
# Output retains screenshots and a timestamped receipt; never pass a user profile.
PERSISTENCE_BASE_URL=http://localhost:3000 \
PERSISTENCE_OUTPUT_DIR=/absolute/task/evidence \
node scripts/verifyPersistence.cjs
# Optional: CHROME_BIN=/absolute/path/to/an/existing/chrome executable.
# PowerShell uses $env:PERSISTENCE_BASE_URL / $env:PERSISTENCE_OUTPUT_DIR instead.

# Existing develop-only Pages workflow builds/tests/deploys on a develop push.
# Use the normal feature PR workflow; do not run publishing against main/master.
# Post-deployment verification (public HTTP reads plus isolated browser checks):
PAGES_BASE_URL=https://yuxiaoli.github.io/daedalOS/ \
EXPECTED_SHA='FULL_DEPLOYED_SHA' node scripts/verifyPages.cjs

# Optional supported diagnostics and container build/run.
yarn build:bundle-analyzer
yarn unused-scan
yarn docker:build
yarn docker:run
