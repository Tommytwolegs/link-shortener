# Release runbook — v1.11.0

Order: **commit → Chrome → Firefox → ratherlinks.com**. Stores go first so their
review queues start; the site is independent and can go anytime.

**Who does what:** package builds, verification, and the local commit are done/doable
here. **You** run `git push`, both store uploads, and the site deploy (these need your
credentials). Nothing below force-pushes; pushing the tag is your call per usual.

---

## Pre-flight — already done and verified

- `manifest.json` version = **1.11.0**
- **222/222** test files pass; `node scripts/check-wiring.js` clean (216 modules, 266 toggles, 562 host permissions, 10 locales)
- No null-input throws; spot-checks (Maps, Vimeo, Dropbox, Indeed, Imgur) clean
- Public store copy has **zero em dashes**; counts refreshed (nearly 300 sites, ~45,000 checks)
- Packages built in `dist/`:
  - `link-shortener-1.11.0.zip` — Chrome (no gecko block)
  - `link-shortener-1.11.0.xpi` — Firefox (includes `browser_specific_settings.gecko`)
- `jimothylinks/assets/cleaner.js` regenerated = **219 modules** (216 sites + utm/redirect/texturl)

---

## Stage 0 — Commit the release (local; you push)

Working tree holds all v1.11.0 changes: modified files (null-hardening, audit fixes,
docs, manifest, popup split, 10 locales) plus ~66 new untracked site modules + tests.
There is also **1 earlier commit already ahead of `origin/main`** that will go up with this push.

```powershell
cd "C:\Users\tommy\Documents\Projects\Link Shortener\link-shortener"
git add -A
git -c user.name="Thomas Powers" -c user.email="tommydpowers@gmail.com" `
    commit -m "release: v1.11.0 — coverage packs (maps/video, real-estate/jobs, resale, entertainment, dev/tech, cloud/files, design, learning), edge-case audit fixes, null-input hardening, Design & images popup group"
git tag v1.11.0
git push origin main        # tag push optional — your call
```

If you'd rather not commit this runbook file, `git reset RELEASE-v1.11.0.md` before committing.

---

## Stage 1 — Chrome Web Store (update existing item)

Existing listing: `https://chromewebstore.google.com/detail/hffnedgkbfnphmibabalnlkcglkdbkkp`

1. Chrome Web Store **Developer Dashboard** → open the item.
2. **Package → Upload new package** → `dist/link-shortener-1.11.0.zip`.
3. **Listing** tab: if refreshing copy, paste the Description block from `STORE_LISTING.md`
   (the "nearly three hundred sites / 45,000 checks" version).
4. **Privacy** tab: single purpose + permission justifications. `host_permissions` grew to
   562 but the rationale is unchanged (per-site URL cleaning, no host does anything new in kind).
   If the dashboard flags added match patterns, the justification is the same as prior versions.
5. **Submit for review.** Review typically takes a few hours to a few days.

---

## Stage 2 — Firefox AMO (upload new version)

Existing add-on: `https://addons.mozilla.org/firefox/addon/rather-s-link-shortener/`

1. AMO **Developer Hub** → your add-on → **Upload New Version**.
2. Upload `dist/link-shortener-1.11.0.xpi` (gecko id `link-shortener@tommytwolegs.github.io`,
   `strict_min_version` 140.0 — already inside the xpi).
3. Let auto-validation run. Source-code upload should not be required (plain JS, no build/minify step).
4. **Notes to reviewer:** paste the reviewer-notes block from `STORE_LISTING.md` (em-dash-free).
5. **Submit.** Auto-validation is instant; human review follows.

---

## Stage 3 — ratherlinks.com (static site)

Static: `index.html`, `privacy.html`, `assets/`. No build step. Webroot `/var/www/ratherlinks`
already renamed at v1.10.0 (one-time `mv` not needed again). Full detail in `jimothylinks/DEPLOY.md`.

1. Confirm `assets/cleaner.js` is the fresh bundle (**219 modules** — verified). If you rebuilt
   the extension again after this, regenerate with the node one-liner in `DEPLOY.md`.
2. Upload from PowerShell:

   ```powershell
   scp -r "C:\Users\tommy\Documents\Projects\jimothylinks\index.html" `
          "C:\Users\tommy\Documents\Projects\jimothylinks\privacy.html" `
          "C:\Users\tommy\Documents\Projects\jimothylinks\assets" `
          <user>@<droplet-ip>:/var/www/ratherlinks/
   ```

3. **No caddy reload needed** for a content-only update (file_server serves the new files
   immediately). Reload only if you change the Caddyfile.
4. Spot-check live: open ratherlinks.com, paste a Zillow/Indeed/Dropbox URL into the try-it box,
   confirm it cleans (proves the 219-module bundle is live).

---

## Post-release checks

- Store listings' **website** field → `https://ratherlinks.com` (done v1.10.0 per DEPLOY.md).
- Swap **privacy-policy URL** on Chrome/AMO from the GitHub link to
  `https://ratherlinks.com/privacy.html` if still pointing at GitHub.
- Optional: promo art still reads "200+ sites" (understated, not wrong); regenerate if you want it current.
- Optional: `DEPLOY.md` step 2 still says "~153 modules" — stale guidance; the real number is now 219.
- Watch both dashboards for review outcome; reply to any reviewer questions.
