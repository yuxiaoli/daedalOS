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

## Canonical welcome rollout — 2026-10-27

Status: exact copy and noninteractive safety checks implemented on the feature branch; draft PR and parent review next.

- Approved source: DOT_NOTES projects/repos/boot-loader/welcome.md at
  bb681b8fd0085af3cc15ef02e6da1b955404e5ce.
- Replace only the previous bundled public/Users/Public/Documents/Welcome.txt.
  Preserve every approved word, six paragraphs and the Keep exploring URL.
  Expected UTF-8 length: 525 bytes, no trailing newline; Git blob
  fe7e9edba1d4cbbe07d44e43dea42bd5e3f234b7; SHA256
  8cfade6f56f8046d1a2deae329e43d3f024095917d18dc11e436b095d9c9fb36.
- Preserve edited, empty, deleted and renamed files through the existing writable
  overlay. Do not migrate, reset, clear or reseed browser storage.
- Keep MIT, Dustin Brett attribution and bundled credits on their existing separate
  surfaces. Do not append them to the immutable welcome copy.
- Existing default branch: develop. Latest remote/local develop baseline:
  3c61852373934bdf327dadbbc5c6eaf4c9639149. Read-only main remains
  0dae88ccb68ff50d269cc0f9266dcbb457b4cc20. No open PR or local changes found.
- Working branch: feat/canonical-welcome-20261027, created from latest origin/develop.
  Submit draft PR to develop; await the parent's substantive exact-head review,
  then mark ready and merge normally when checks/protections permit. No direct
  implementation push to develop and no main/master mutation or force push.
- No control of the user's browser, CUA or device UI. Existing isolated automated
  CI remains intact as clarified by the parent; manual rendered/device review is
  left to Sean. Add noninteractive HTTP byte/revision checks and label coverage.

Acceptance tasks:

- [x] Pin and verify exact source/worktree/Git blob bytes without automatic EOL or
      final-newline rewriting.
- [x] Characterize existing overlay safety for edited, empty, deleted and renamed
      notes; keep production storage code unchanged.
- [x] Update the old welcome assertion in existing CI without removing other checks;
      verify served Welcome.txt bytes and exact deployed revision by HTTP.
- [ ] Run appropriate source tests/build checks, create draft PR and provide head SHA,
      diff and actual results for independent parent review.
- [ ] After review, ready/ordinary merge; verify merged develop deployment and exact
      public bytes; report source, PR, merge, CI and remaining verification limits.

The previous personalization rollout completed at develop 3c61852 on 2026-10-25
with 22 passing Linux tests and successful Pages run 40205290966. Earlier entries
above retain their historical in-progress snapshots; this section is the active
rollout plan.

Rollout checks (2026-10-27): the exact-byte test failed on the former 1049-byte working copy, then passed on the approved 525-byte file and Git blob fe7e9edb. Eight targeted tests pass: exact bytes plus seven real bundled HTTPRequest/OverlayFS remount cases with retained InMemory upper storage and deletion-log fencing. Isolated TypeScript checking of the new tests, targeted oxlint, script syntax and diff whitespace checks pass. The full Windows Jest run has 29 passing tests and the same pre-existing wallpaper Albums-path assertion failure; that test and production wallpaper/storage code are unchanged. Real IndexedDB reopen/durability and manual/device appearance are not covered by these tests.

The large local public-asset materialization stalled and was canceled without source loss; only the small bundled BrowserFS files were fetched for real backend testing. No local production-build success is claimed. Existing develop-only Linux CI will run its complete unit/build/isolated acceptance suite on the merged commit; no PR-triggered workflow or check result is invented. The existing workflow, license, CREDITS and production filesystem implementation are unchanged.

## Save and slideshow repair - 2026-10-31

Current authorized phase for UNKNOWN-20261029-014-DOT-20261029-015, based on
develop e6bcfe2adc1cce71ad061c87451f3d2966832e59. Feature branch:
feature/save-slideshow-persistence-20261031.

- Fix the reproduced Save-button empty-string omission; preserve the canonical
  Welcome bytes and existing user storage.
- Keep slideshow playlist entries as virtual paths; read local/shipped virtual
  files through BrowserFS, decode before displaying, bound failed loads, and
  release object URLs on replacement, cancellation and unmount.
- Use POSIX joins for browser virtual paths. The historical plan above identifies
  the old Windows failure as the Albums-path assertion; re-run its original
  source before calling that issue reproduced/resolved.
- Add focused Save/resolver/hook tests and real-app persistent-profile integration.
  Each run creates a new disposable profile; only that profile is removed.
- Run relevant tests, lint/type/build checks, review the exact diff and follow
  feature PR -> develop. Main/master are user-only and remain untouched.
- Use the existing develop Pages deployment and verify the exact served commit
  and real Save/slideshow/restart behavior. A source push is not delivery.
- Record actual results and remaining platform limits in docs/ACCEPTANCE.md.

## Local follow-up: early boot persistence

The frozen commit `eb3a2d2dd4d42d87eca04c14e2864caf890efee6` and all failed receipts remain preserved. Publication was denied by automatic approval review; this follow-up is local only. Do not retry the upload, create a PR, merge or deploy without the required approval.

- Replace the ref-only boot gate with reactive readiness so opening the gate saves the latest session, including wallpaper edits made during initialization.
- Retain the existing delay, persisted session fields and halt/resume semantics; cancel the readiness timer on unmount.
- Add hook regressions and a deterministic real-UI early-interaction restart case. Hold only the session-readiness timer in the disposable test page; keep its nonzero timer ID, let other startup work settle, select the slideshow before readiness, release the gate, then restart the full browser without another state-changing action.
- Reproduce the failure against the preserved build before testing the repaired production build and the complete Save/slideshow integration matrix.
- Produce a revised exact local commit, combined patch, source manifest and approval packet. Canonical Welcome, reserved main/master and real user profiles/settings remain unchanged.
