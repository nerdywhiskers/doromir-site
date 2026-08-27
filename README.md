# doromir-site

The public website for **Doromir**. Three of these pages are what Google Play and the
App Store require before they will accept a submission; the rest are the product:

| Path | Purpose |
|---|---|
| `/` | Landing page |
| `/pricing/` | What the app costs, what it will cost later, and why the free tier can stay free |
| `/blog/` | The dev log. One page, entries stacked newest first |
| `/faq/` | The same answers the app shows under Profile → FAQ |
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

The hero's button row is a pair: a non-interactive
`<span class="btn btn--pending">Coming to Android</span>` beside the live
`<a class="btn">` Subscribe action. The pending pill is the placeholder. Once the
listing is live, swap it for an `<a class="btn" href="…">` and it picks up the real
button styling (hard shadow, hover press) automatically.

Once it does, the two buttons become two live actions of equal weight, which the row
was not designed for. Demote the Subscribe one to `.btn--ghost` in the same release, so
the store link is unambiguously the primary.

---

## How someone joins the beta

Three buttons point at `https://doromir.substack.com/subscribe`: one in the landing
hero, and one closing each Availability section on `/` and `/pricing/`. Subscribing is
the signup, because the invites go out through the publication, so the site never has to
collect an address itself. **All three carry the same label and the same Substack mark.**
Changing one means changing all three.

This is a plain link, not Substack's `/embed` iframe, and that is deliberate. The iframe
renders Substack's own white panel at a fixed 480px, which overflows a phone and cannot
be restyled from this side because it is cross-origin. It also loads third-party script
and cookies onto the same page as the "No analytics, no ads, no trackers" pledge. A link
keeps the site's own button, costs no network request, and hands the email field to
Substack, which is where it has to be validated anyway.

The closer rows use `.btn-row .btn-row--center`. `.closer` centres its *text*, but a flex
row does not inherit that, so without the modifier the button sits at the left edge under
centred copy. The hero row is left-aligned like its copy, so it keeps plain
`.btn-row .btn-row--stack` and needs no modifier.

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

## Search engines

There is no build step, so everything below is hand-written and has exactly one
maintenance rule each. None of it is optional decoration: without it a crawler sees
eight unrelated HTML files rather than one product.

**`sitemap.xml`** lists the six indexable pages. `/delete-data/` and `/404.html`
stay out because both are `noindex`. It carries no `<lastmod>`, `<changefreq>` or
`<priority>` on purpose — Google ignores the last two, and a hand-written date on
the first goes stale the moment a page changes without someone remembering to come
back and edit it, which is read as an unreliable signal and scores worse than
leaving it off. **Rule: add a `<url>` when you add a page.**

**`robots.txt`** disallows nothing and points at the sitemap. The two `noindex`
pages are deliberately *not* listed here — a crawler has to fetch a page to read
its `noindex` tag, so blocking them in `robots.txt` would stop the tag from ever
being seen and leave both URLs indexable on inbound links alone.

**Every page carries `<link rel="canonical">` with its full `https://doromir.com/`
address.** Pages can serve the same files from more than one hostname, and the
canonical is what says which one counts. **Rule: a new page needs a canonical
pointing at itself.** `/delete-data/` is the one exception — it points at
`/privacy/`, the page that actually holds the section, because it is a redirect
stub rather than a page of its own.

**`og:image` is an absolute URL on every page.** Open Graph has no notion of the
page it was found on, so a relative path resolves to nothing and every link
preview on every platform silently falls back to a blank card. This is the one
tag here where a plausible-looking value is the same as no value at all.

The image is `assets/img/doromir-banner.png`, and `twitter:card` is
`summary_large_image` so it renders as a wide card rather than a thumbnail. The
banner is 1024x512, which is a 2:1 ratio against the 1.91:1 the platforms
actually crop to, so a couple of percent comes off the top and bottom edges.
Nothing sits close enough to either edge to be lost. **If it is ever re-cut, aim
for 1200x630 and keep the wordmark and tagline out of the outer 5%.** Filenames
are case-sensitive on Pages, so the tag and the file have to match exactly.

**Titles carry the search terms; `og:title` carries the voice.** The `<title>` is
the blue headline in a search result and the strongest single signal Google has
for what a page is about, and nobody is searching for a brand they have not heard
of yet. So the titles say what the thing is: `Doromir - private dream journal and
alarm for Android`, `Dream journal FAQ - Doromir`. None of this is visible on the
page. The h1 is a separate piece of text and still reads "Speak your dream before
it fades."

`og:title` on the landing page deliberately keeps that original line instead. A
social card is being scrolled past by someone who was not looking for you, where
a good line beats a matched keyword, and `og:title` counts for nothing in ranking.
The two tags exist so they can differ. Keep titles under about 60 characters,
which is where Google starts truncating. The legal pages are left alone; they
should not be competing for anything.

**Structured data.** The landing page carries a `MobileApplication` block in
JSON-LD: what the app is, who publishes it, that it costs nothing. It holds no
`aggregateRating`, and must not gain one until there are real ratings to report —
invented ratings are the one thing in this vocabulary Google treats as a manual
action rather than a mistake. Blog entries are marked up inline with microdata
instead of a second JSON-LD block, so the machine-readable copy *is* the visible
copy and the two cannot drift apart. See the dev log section.

**Not present, and the reason.** There is no `FAQPage` block on `/faq/`. Google
withdrew FAQ rich results for everything except government and health sites in
2023, so the visible payoff is gone, and the cost is a hand-maintained second copy
of twenty-three questions that would silently fall out of step with the page on the
first edit. The FAQ's semantic `h3` questions already carry the meaning.

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
| In-app purchases or subscriptions | The liability cap in terms §12 refers to Doromir being free, and `/pricing/` says every tier is unbuilt |
| A feature listed on `/pricing/` moving behind a paywall | The first of the four promises on that page, which is the strongest commitment on the site |

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

## The pricing page

`/pricing/` is the one page that is partly about the future, so it is the one most
able to become untrue quietly. Two halves, with different failure modes.

### The free card is a factual claim about the shipped app

Six lines cover twelve features, so **each line has to be true of everything folded
into it.** Checked against `dream-app` @ `main` on 2026-08-23, the same way the
privacy claims are:

- "export as JSON, CSV or an Obsidian vault" — all three exist: `lib/dataExport.js`,
  `lib/dreamCsv.js`, and the Obsidian-compatible Markdown vault in `lib/dreamMarkdown.js`.
- "automatic backups" — scheduled backup to a user-chosen SAF folder ships
  (`lib/backupSchedule.js` + `lib/backupDestination.js`), which is why the page can put
  it in the free card rather than in a plan.
- "encrypted dream text" is deliberate wording, not shorthand for everything.
  `lib/contentCipher.js` seals title, mood, transcript, insight and attachment captions;
  **the recording file and any attached image are not encrypted.** Never widen this to
  "everything is encrypted" — same guardrail as the store listing.
- The page says "search" and "the Dream Map" as separate things and never says
  *semantic search*, because the journal search box is keyword-based. Semantic matching
  appears on an opened entry and in the Dream Map only.

### The two plans are proposals, and nothing behind them is built

No accounts, no sync, no offline chat, no journal profiles, no IAP. Three things say
so, and **all three are load-bearing** because the section carries no explanatory prose:

1. the `Planned` kicker on each card,
2. the `Not yet available` line where a second price would normally sit,
3. `.tier--planned`'s dashed, shadowless border — the same not-yet-a-link treatment
   `.btn--pending` gives the store button on the landing page.

Remove any one and the section reads as a store, which would mislead the first person
who tries to buy. **If either plan ever ships, all three go in the same release**, and
terms §12 has to stop saying Doromir is provided free of charge.

Both closers also promise **a free lifetime membership to the first 100 users.** Nothing
counts them. They now point at the Doromir Substack instead of the
`support@doromir.com` inbox, so the subscriber list, which Substack orders by signup
date, is the closest thing to a record. It is still not a list of the first 100 *users*,
so either keep the count by hand as invites go out, or take the sentence down. It is the
one claim on the site that can be quietly broken by simply not tracking it.

Prices and contents last set 2026-08-23 (Plus $4.99/mo; Lifetime $49.99 once). They
descend from Scenario C of
[`dream-app/docs/Cost Model - Hosting and Scaling.md`](../dream-app/docs/Cost%20Model%20-%20Hosting%20and%20Scaling.md)
but no longer match it — the cost model prices image generation, which this page does
not offer. Re-read that document before changing a number here, and update it if the
product decision has genuinely moved.

---

## The dev log

`/blog/` is one file. Entries live inside it, newest first, and each is an
`<article>` with the date as its `id`. There is no page per post and no index to
keep in sync, because there is no build step here to generate either — a page per
post would mean hand-copying the `<head>`, header and footer every time.

`blog/index.html` carries two commented-out blocks, and neither is meant to be
deleted:

- **SKELETON** — the minimum entry. Copy it, paste it at the top of `.log`, fill in
  the dates and the copy.
- **REFERENCE** — a worked entry using every element the stylesheet already handles:
  sub-heading, both list kinds, both figure kinds, the `.note` callout. It describes
  itself in its own copy, because HTML comments cannot nest and a commented block
  therefore cannot carry comments of its own. Lift pieces out of it rather than
  inventing markup.

Four things matter:

- **The `id` is the permalink**, and it is the date in `YYYY-MM-DD` form. It never
  changes once published, even if the headline does — a linked entry that moves is
  worse than one with a stale title.
- **`datetime` and the visible date have to agree.** The attribute is what a reader
  or a feed reads; the text beside it is what a person reads.
- **Entry bodies reuse `.prose`**, the same typography the FAQ and the legal pages
  set, so `<h3>`, `<ul>`, `<ol>` and `<strong>` are already styled. Only `.log-date`,
  `.log-title` and `.log-figure` are the log's own.
- **The `itemscope` and `itemprop` attributes are structured data, and they come
  across with the skeleton.** Nothing renders differently without them, which is
  exactly why they get stripped by accident. They mark the entry as a dated post
  with a headline, using the tags it already has. Microdata rather than a second
  JSON-LD block on purpose: the machine-readable copy *is* the visible copy, so an
  edit to the headline cannot leave a stale duplicate behind the way a separate
  block would.

Screenshots go in `assets/img/blog/`, named for the entry that uses them, and get a
`<figure class="log-figure">`. A capture off the phone adds `log-figure--portrait`
as well: portrait captures are about twice as tall as they are wide, and at the
column's full width one is taller than the screen reading it, so the entry becomes a
screenshot with text around it. The modifier holds it to a phone-sized column.

The visitor-facing label is **Blog** everywhere it appears: the header link, the
chip at the top of the page, and the front of the `<title>`. The page's own headline is what
says the rest. "Dev log" survives only in this README and in the source comments,
where it describes the kind of thing the page is.

Renaming that link is not free. The header fits four actions and a button on one
row only down to a measured width, and the two-row fallback below it is scoped to
a media query holding that number. A longer label moves it. See the two header
queries in `assets/css/site.css` — the comment on the second one carries the
current measurements and the reason they travel together.

---

## Social links

Three accounts, in the footer of every page: TikTok
([@nerdywhiskers](https://www.tiktok.com/@nerdywhiskers)), X
([@NerdyWhisker](https://x.com/NerdyWhisker)) and
[Substack](https://doromir.substack.com/). The first two belong to **Nerdy Whiskers**,
the publisher, not to Doromir the product, which is why their `aria-label`s say so.

The Substack is the exception. `doromir.substack.com` is the app's own publication, so
its `aria-label` reads "Doromir on Substack". Nerdy Whiskers keeps a separate general dev
log at `nerdywhiskers.substack.com`; this site deliberately does not link it, because the
Availability closer sends beta signups to the Doromir publication and two Substack links
in one footer would split them.

They are inline SVG rather than an icon font or a sprite, for the same reason
everything else here is: no network request, no dependency, and `currentColor` so
they take the footer's `--muted` and its white hover for free. Brand marks are the
one place on this site that draws filled icons instead of the 2px strokes the chips
and buttons use — there is no recognisable X or TikTok note in an outline.

Adding a fourth is a copy of one `<li>` into every page's footer. Two rules travel
with it:

- Each mark keeps its 40px box. It is the tap target, and three adjacent 18px
  glyphs with no padding are three links a thumb cannot pick between.
- The list's `margin-left: -11px` is that box's own padding cancelled, so the first
  glyph lines up with the column of links above it rather than sitting inset.

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
  `mobile/theme/streamShader.js`, with the palettes generated the same way
  `mobile/theme/streamPalettes.js` generates them. The full-page instance runs
  *Ink* at *subtle*; a near-neutral ring reads as weather behind the page rather
  than as colour competing with the rose and teal the UI spends on meaning.
  Any `canvas[data-stream]` in the page gets its own instance sized to its own
  box, running the app's shipped default instead — *Teal* at *subtle* — because
  those stand in for the app's background rather than the site's. The landing
  page uses one for the empty phone screen in the last showcase row. Every
  instance freezes to a single still frame under `prefers-reduced-motion`, stops
  advancing in a background tab, and falls back to a static CSS gradient where
  WebGL is unavailable.
- **Dream orb** (`assets/js/orb.js`) is the breathing orb from the app's wake
  screen, ported from `mobile/theme/orbShader.js` and drawn on the hero at
  several times the size the phone gives it. One line differs from upstream: the
  app returns opaque black outside the halo because the wake screen behind it is
  black, so the web port recovers alpha from the colour the shader already
  computed — identical over black, correct over the ambient background.
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
