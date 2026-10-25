# Personal desktop defaults

Updated 2026-10-25 UTC.

## Scope and constraints

- Personalize this existing yuxiaoli/daedalOS fork for Sean / Yuxiao Li; use the
  user-confirmed public homepage https://vectorindex.cloud and GitHub yuxiaoli.
- Keep upstream authorship, MIT license, third-party credits and documentation.
- All changes and deployment source belong on develop. Main is a read-only
  upstream cache maintained manually by the user. Do not synchronize or rewrite it.
- Reuse https://yuxiaoli.github.io/daedalOS/ and its existing Pages workflow.
- Touch bundled defaults only; preserve saved documents and browser storage.
- Do not edit Boot Loader, Win11, other OS repositories, credentials or security.
- Use a concise professional summary authorized by the user; publish no private
  contact details or unverified resume facts.

## Verified starting state

- develop: 5f7b93d1ddc90962dc768f8c384c2f0790855464.
- main: 0dae88ccb68ff50d269cc0f9266dcbb457b4cc20.
- Remote default changed from main to develop and re-read verified on 2026-10-25.
- Existing Pages workflow tests, builds and deploys develop; it verifies exact
  commit and desktop/terminal/session flows. Existing public URL opens correctly.
- Read AGENTS.md, README, package/lock/build/workflow files and the DOT protocol.
- No existing project plan or TODO found in the starting develop tree.

## Work and acceptance

- [x] Audit application source and distinguish package attribution from identity.
- [x] Prepare personal title/metadata, browser homepage/bookmarks, terminal greeting,
      bundled Welcome text and desktop shortcuts, preserving original package author.
- [x] Check script syntax, diff whitespace, generated sitemap/RSS/robots URLs and Welcome shortcut target.
- [ ] Run existing CI unit tests and production build. Local locked install succeeded with the documented OpenSSL option; local Jest ran with 18 passing tests, one Windows directory-path assertion failure and one suite blocked by sparse-checkout BrowserFS assets. Complete Linux CI remains required.
- [x] Recheck remote head, commit and safely push develop without rewriting history.
- [ ] Verify exact commit's existing Pages build/deployment and live browser flows:
      homepage/bookmarks, external GitHub link, Welcome document and saved session.
- [ ] Record final SHA, workflow URL, checks, remaining limitations and scope coverage.

The complete application directory was inspected for owner names, URLs, usernames,
welcome content and contact defaults. Games, emulators, editors, media apps and
libraries remain branded as their upstream applications. Runtime validation is
focused on changed entrypoints; this is not an assertion that all games or remote
services were exercised.

Messenger has no verified personal Nostr address; its bundled author contact seed is now blank. Existing messages, keys and saved contacts are unchanged. No private email or full resume was added.

## Browser follow-up

The previous deployed Browser shows an empty frame for Google and Vector Index in Chrome and Edge. Keep the iframe sandbox unchanged. Check element-based frame navigation and provide an explicit external Vector Index bookmark; verify the real portfolio through the external fallback even if embedding remains unavailable.

Initial personalization pushed as b7d9bde154f06310db98c573ebfe95b4daae02e8; Pages run 40203143619 is in progress. Main SHA re-read unchanged.

CI run 40203143619 completed locked install and the full Linux unit suite successfully. Changed application sources pass targeted oxlint; formatting and script syntax checks pass. The browser follow-up will receive a new develop commit and its own exact-commit Pages verification.

The first Pages deployment succeeded, but its browser acceptance check failed when opening Welcome: Monaco stayed on its loading screen. Its loader config used a root /Program Files path without the existing /daedalOS prefix. Repair that path, keep bundled editor behavior, and rerun exact-commit CI; do not treat the first deployment as fully verified.

Independent source review found no blocking source/privacy issue. It caught a live-test assertion that read an early Welcome line after terminal scrolling; the final test uses the document tail instead. Full Linux unit tests also passed for source commit 3f1afc890297225d3861644c03048248c5d536f3. Embedding is verified visually only when real page content is visible; URL assignment alone is not proof.
