# BrowserFS OverlayFS lower-read size

The vendored BrowserFS bundle is derived from `jvilk/BrowserFS` at `a96aa2d`,
but contains changes beyond that upstream revision. Preserve the existing bundle
and its BrowserFS attribution in `public/CREDITS.md`; do not rebuild it from the
unmodified upstream source. `browserfs-overlay.patch` documents the equivalent
change to upstream `src/backend/OverlayFS.ts`. The original vendored Git blob is
`8f7c765740c2aa067ff76737b1e758fedbe0db90`; the patched blob is
`69582a65ef843b9ea24fc730326dbd64b8a90098`.

The HTTP server may report compressed Content-Length on HEAD while GET returns
decoded bytes. OverlayFS clones that size before reading the lower file. Set the
clone's size to the returned buffer length on successful lower reads, so the
preloaded file receives consistent data and metadata. Writable overlays and
lower read errors retain their existing paths.

`node scripts/patch-browserfs-overlay.cjs` applies the exact guarded change to
the original bundle or verifies that it is already applied. Run
`node scripts/test-browserfs-overlay.cjs` to exercise the actual bundled code,
including a reconstructed original as a negative control. If the vendor bundle
changes, review and regenerate this patch and its pinned blob IDs.
