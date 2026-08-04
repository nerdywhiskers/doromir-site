# doromir-site

The public website for **Doromir** — the four pages Google Play and the App Store
require before they will accept a submission:

| Path | Purpose |
|---|---|
| `/` | Landing page |
| `/privacy/` | Privacy policy — **required by both stores** |
| `/terms/` | Terms of service |
| `/delete-data/` | Data-deletion instructions — **Google specifically requires this URL** |

Static HTML and CSS with one small vanilla-JS file. No build step, no dependencies,
no package manager. Open `index.html` in a browser and it works.

---

## Before this goes live

Three placeholders are deliberately left in the source and are styled loud
(amber, dashed underline) so they cannot ship unnoticed.

### 1. `DOMAIN-TBD` — the contact email

Appears in every page's footer and in the contact section of each legal page.
Replace once the domain is bought:

```powershell
Get-ChildItem -Recurse -Filter *.html |
  ForEach-Object {
    (Get-Content $_.FullName -Raw) -replace 'DOMAIN-TBD', 'yourdomain.com' |
      Set-Content $_.FullName -Encoding utf8
  }
```

Then delete the now-pointless `<span class="todo">` wrappers around the addresses.

Use a `support@` forwarding address on the domain, never a personal one — it is
displayed publicly on the store listing.

### 2. `STATE-TBD` — governing law in `/terms/`

The US state the LLC is registered in. One occurrence, in section 14.

### 3. Store link on the landing page

The primary call to action is currently a non-interactive
`<span class="btn btn--pending">Coming to Google Play</span>`. Once the listing is
live, swap it for an `<a class="btn" href="…">` and it picks up the real button
styling (hard shadow, hover press) automatically.

---

## Deploying to GitHub Pages

The directory layout is already Pages-shaped — `privacy/index.html` serves at
`/privacy/`, so no rewrite rules or build step are needed.

1. **Settings → Pages → Deploy from a branch**, select `main` / `/ (root)`.
2. Add the custom domain under **Settings → Pages → Custom domain**. That writes a
   `CNAME` file to the repo root; leave it there.
3. Point the domain's DNS at GitHub Pages (an `ALIAS`/`ANAME`/flattened `CNAME` at
   the apex, or a `CNAME` on `www`).
4. Tick **Enforce HTTPS** once the certificate is issued.

> The repo is **private**. GitHub Pages can serve from a private repo only on paid
> plans — on the free tier the repo must be public for Pages to publish. Either make
> it public when you are ready to launch, or deploy the same files to Cloudflare
> Pages / Netlify, both of which serve private repos for free.

`.nojekyll` is present so Pages serves the files verbatim rather than running them
through Jekyll.

---

## Keeping the claims true

**Everything on `/privacy/` is a factual claim about the app, verified against the
`dream-app` source at the time of writing.** These pages are legal documents, and
Google audits the Data Safety form against them. Each of the following changes to
the app makes a statement here false and requires a matching edit *in the same
release*:

| If the app gains… | What breaks here |
|---|---|
| Sentry, Crashlytics or any crash reporter | "no crash-reporting SDK" (privacy §4), the landing-page pledge, and the Play **Data Safety** form all become wrong |
| Any analytics SDK | Same three places |
| A shipping `EXPO_PUBLIC_DREAM_VIDEO_URL` (the dream-video prototype) | "the released app makes no network requests" (privacy §8) and "nothing leaves your phone" become false, and transcripts would be leaving the device |
| Cloud sync, accounts, or a backend of any kind | Most of the privacy policy, and the whole premise of `/delete-data/` |
| A new Health Connect record type | The enumerated list in privacy §7 |
| A new Android permission | The list in privacy §10 |
| In-app purchases or subscriptions | The liability cap in terms §12 refers to Doromir being free |

Verified at the time of writing (`dream-app` @ `main`, 2026-08-04):

- No analytics, crash-reporting, advertising or tracking SDK in `mobile/package.json`.
- The only outbound URL in a release build is the optional Gemma download from
  `huggingface.co` (`mobile/lib/gemmaModelStore.js`).
- The MiniLM embedding model and the Whisper model are **bundled in the APK**
  (`mobile/assets/models/`), so neither involves a network request.
- Dream-video is off unless `EXPO_PUBLIC_DREAM_VIDEO_URL` is set at build time;
  unset, no endpoint string exists in the bundle at all.
- Health Connect record types read: `SleepSession`, `HeartRateVariabilityRmssd`,
  `RestingHeartRate`, `Steps`, `ActiveCaloriesBurned`, `ExerciseSession` — read
  access only (`mobile/lib/healthProviders/healthConnectMappers.js`).

---

## Design

The visual system is **Lucid Psychedelia**, ported from the app so the site and the
product look like the same thing. Source of truth is
`dream-app/mobile/theme/` — if a token changes there, change it here.

- **Tokens** (`assets/css/site.css`) mirror `mobile/theme/lucid.js`: pure black
  canvas, rose `#FFDAD4` as the on-dark ink, teal `#B0ECFA` for the brand and
  primary action, marigold `#FFDF9F` for accents. Two radii only — 12px frames,
  pill for anything tappable. 2px borders, 4px hard non-blurred offset shadows that
  grow to 6px on hover.
- **Background** (`assets/js/stream.js`) is the app's ambient "river of
  consciousness" shader — the GLSL is ported verbatim from
  `mobile/theme/streamShader.js` with the default *Lucid* palette and *medium*
  intensity from `mobile/theme/streamPalettes.js`. It freezes to a single still
  frame under `prefers-reduced-motion`, stops advancing in a background tab, and
  falls back to a static CSS gradient where WebGL is unavailable.
- **Header** mirrors `mobile/theme/PageHeader.js`: white crescent mark, teal
  wordmark, 4px rule beneath.
- **Legal prose** sits on a blurred glass panel, the same way the app renders its
  in-app privacy screen — dense text directly over the animated shader is
  unreadable.

### Fonts

Self-hosted from `assets/fonts/`, copied from the app. All three are
redistributable:

| Family | Role | Licence |
|---|---|---|
| Guanine | Headings, wordmark | CC0 — no rights reserved |
| Anybody | Buttons, numerals | SIL Open Font License 1.1 |
| Work Sans | Body, labels | SIL Open Font License 1.1 |

---

## Local preview

Any static server works. The pages use root-relative paths (`/assets/…`), so open
them through a server rather than `file://`:

```powershell
python -m http.server 8080
# then visit http://localhost:8080
```
