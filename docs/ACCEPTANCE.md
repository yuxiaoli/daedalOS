# Save and slideshow acceptance

Task: UNKNOWN-20261029-014-DOT-20261029-015. Repair base: develop
`e6bcfe2adc1cce71ad061c87451f3d2966832e59`. Validation on 2026-10-30 UTC
(2026-10-31 Hong Kong), Windows 10.0.22631 x64, Node 24.15.0, Yarn 1.22.22,
Playwright 1.63.0. Only isolated task checkouts and disposable profiles were used.

## Scope and recovered failure

The canonical task's Windows wallpaper referent is this web OS's outstanding
Windows test, not the host machine's wallpaper. The retained 2026-10-27 entry in
`context/plans/PLAN.md` names the Albums-path assertion. Its original test is
recoverable at the base commit, blob `941e2df10185f63b122cb4d9bdbd8ae12fee16a9`.

Executing that original hook/test on Windows reproduced its line 167 failure:
`readdir` visited Pictures but not `/Users/Public/Pictures/Albums`. Using
`path.posix.join` fixes virtual path traversal. The original historical run log
was not recovered; this is a new reproduction from the recorded source.

Production acceptance also reproduced two user-visible defects: the Save button
ignored an empty string, and a browser-local slideshow file was requested from
public HTTP, returned 404, and did not render. The fixes accept an empty string,
read virtual images through BrowserFS, retain virtual playlist entries, and
manage transient object URLs across decode, cancellation and crossfade cleanup.

## Initial scoped repair checks

- Full Jest: **45 passed, seven suites**. Includes empty/nonempty Save, virtual,
  shipped, external, missing, empty and invalid image data, cancellation, resized
  URL cleanup, crossfade lifetime, missing-entry stability, and Windows recursion.
- Existing IndexedDB fixtures: **21 passed**, seven each on Windows Chromium,
  Firefox and WebKit. Newly executed with one worker. These are storage fixtures.
- TypeScript, targeted oxlint, Stylelint, Prettier and script syntax checks pass.
- Locked dependency install and full static production build pass, with existing
  Next export/header and Node deprecation warnings.
- Actual production-export app integration passes in Chromium 153.0.8010.12 at
  1280x900. Real keyboard edits plus the Save button retain nonempty and empty
  content after document close/reopen and complete browser-process restarts.
- Synthetic imported image renders, its virtual path is saved unchanged, and
  exact image bytes render through a new object URL after a process restart.
  Missing-only playlist stays blank safely; missing-plus-valid falls back to the
  valid local image; the distinct shipped-image control also matches exact bytes.
  No synthetic virtual path reaches HTTP.
- Before and after public Welcome bytes remain 525 bytes, SHA-256
  `8cfade6f56f8046d1a2deae329e43d3f024095917d18dc11e436b095d9c9fb36`.
  Its source blob remains `fe7e9edba1d4cbbe07d44e43dea42bd5e3f234b7`.

The initial repaired-app integration started at **21:05:19.857 UTC**. Browser process
sequence: **45004 -> 27200 -> 54220 -> 27424**. Each browser and all enumerated
children were confirmed exited before the next launch of the same profile.
The receipt includes timestamped model values, process IDs/exits, image hashes,
CSS state and screenshots. The owned profile was removed after verification.

## Evidence and limitations

Local evidence is retained under the task-owned
`E:/workspace/codex/os-save-repair-tools-20261031` directory:
`baseline-tests.log`, `unit.log`, `fixtures.log`, `build.log`, `typecheck.log`,
and `local-ready-evidence/daedalos-persistence-Yhmcic/receipt.json` with screenshots.
Use [scripts/commands.sh](../scripts/commands.sh) to repeat the isolated checks.

A preliminary run that changed the wallpaper before the existing
`window.sessionIsWriteable` boot gate reverted to GALAXY on restart.
Its failed receipt/screenshots are preserved in
`local-final-evidence/daedalos-persistence-AqW4Ix`. Its receipt SHA-256 remains
`aa2344aac90f96baeaa3b2601b8440c148f89786b5e61a560735a726fcbc5b64`. This was the remaining defect in frozen commit
`eb3a2d2dd4d42d87eca04c14e2864caf890efee6`; the local follow-up below resolves it.

## Early-boot follow-up: local acceptance

The original frozen commit is retained as the parent of this follow-up. The boot
gate is now React state: opening it reruns persistence with the latest session.
The existing delay, loaded fields and halt/resume behavior are retained; unmount
cancels the timer. No filesystem format or public Welcome content changed.

Five new hook regressions cover the final early selection, preserving loaded
session fields, normal writes after readiness, halt/resume, and unmount cleanup.
Against the frozen source, three fail (including zero writes for the early edit);
the repaired full suite passes **50 tests across eight suites**. TypeScript,
targeted oxlint/Stylelint/Prettier and the full production build pass.

The real-app regression holds only the existing session-readiness timer on a
dedicated disposable test URL, preserving its nonzero timer ID. It selects the
slideshow through the real menu before readiness, waits for other startup work to
settle, releases that timer, then closes the browser without another state-changing
action. It uses the same test on the frozen and repaired production builds.
The corrected frozen-build run fails after restart, reverting to GALAXY:
`boot-confirmed-baseline-evidence/daedalos-persistence-VDUlyY/receipt.json`.
Earlier harness-development receipts are retained but are not the red regression
proof; the initial timer stub returned zero and did not preserve the old ref gate.

The repaired full matrix passes at **2026-10-30 21:56:57.842–21:57:28.461 UTC**,
using Windows Chromium **153.0.8010.12**, **1280x900**:
early selection survives full browser restart; empty/nonempty Monaco Save survives
document and process reopen; virtual playlist paths remain unchanged; local and
shipped images match exact bytes; missing-only remains safe and missing-plus-valid
falls back correctly; no virtual local-image path reaches HTTP.
The script recognizes both legitimate SLIDESHOW and SLIDESHOW ALT selections.

Browser PID sequence: **40684 -> 45416 -> 14256 -> 48456 -> 44504**. Every enumerated
owned process exited before reopening the same profile. The profile was removed.
Evidence: `boot-fixed-evidence/daedalos-persistence-hU69fT/receipt.json`, screenshots,
`boot-unit.log`, `boot-build.log`, `boot-lint.log` and `boot-typecheck.log`.
The 21 storage-fixture passes above are retained from the initial repair phase;
they were not rerun for this session-state-only follow-up.

No remaining failure was observed in this bounded local matrix. The controlled
timer is test instrumentation, not real-device or native-platform coverage.
Publication remains blocked: automatic approval review denied the initial GitHub
tree upload for lack of trusted approval naming that public payload/destination.
No upload retry, PR creation, merge or deployment occurred in this local follow-up.
A revised exact payload and approval packet are prepared locally for one later
approval request; live verification still requires authorized publication.

This is Windows headless browser coverage. It is not physical mobile-device,
native Linux/macOS, native Safari, or visual acceptance of the other OS forks.
No claim is made that every existing application E2E suite was run.
The full app restart integration is Chromium only; Firefox/WebKit results above
cover IndexedDB fixtures.

The PR must still pass normal review/gates and deploy through the existing
develop-only Pages workflow. The exact merged revision and live acceptance
receipt must be recorded separately after deployment; this pre-merge report
does not claim that the repairs are already live. Main/master, approved Welcome
content, dependencies, workflows and real user storage/settings are unchanged.
