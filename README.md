# Phoneme prototype – sound chart

Front end for the Blast Learning phoneme prototype: a seven-tile sound chart for
kindergarten–3rd-grade children (six sounds plus the word **cat**).

Tapping a tile opens the **lesson**: the avatar's mouth close-up says the sound, then the
side-view tongue animation plays with the sound again, then big **Again / Tongue again /
Sounds** buttons appear. The *cat* tile plays the k · a · t close-ups in a row. After 15 s
without a tap the lesson returns to the chart, so each child starts from the chart.

Tongue animations exist for /θ/ and /ð/; the other sounds skip that step until theirs are
built (`tongue: null` in the manifest). Human / Avatar / Both mode, session logging and the
API are next.

## Run

```bash
npm install
npm run dev        # http://localhost:5173  (also reachable from an iPad on the same Wi-Fi)
npm run build      # static build in dist/
```

Stack: React 19, TypeScript, Vite, Tailwind 4. No UI framework. Sign-in API: Vercel
serverless functions in `api/` (MongoDB, bcrypt, JWT cookie); `npm run dev` mounts the same
handler at `/api/auth/*`, so one dev server serves both.

## Accounts and environment variables

The site sits behind a login / sign-up page. Sign-up takes an email and a password (8+
characters), stores `{ email, passwordHash, createdAt }` in MongoDB (`Phoneme-prototype` →
`UsersTable`) and signs the user straight in; no email verification. Login sets an httpOnly
cookie for 30 days. The account button in the top bar shows the email, language and theme
switches, the mode-usage counters with the CSV download, and Log out — plus, for a manager, a
button back to the dashboard (see [Manager role](#manager-role)).

Local: put these in `phoneme-prototype/.env.local` (git-ignored). On Vercel: Project →
Settings → Environment Variables. Never commit the values.

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | yes | Atlas connection string (user + password included). |
| `JWT_SECRET` | yes in production | Signs the session cookie. Any long random string. |
| `MONGODB_DB`, `USERS_COLLECTION` | no | Defaults `Phoneme-prototype`, `UsersTable`. |
| `USAGE_COLLECTION`, `EVENTS_COLLECTION` | no | Session log collections, defaults `ModeUsage`, `SessionEvents`. |
| `ATTEMPTS_COLLECTION`, `PROGRESS_COLLECTION` | no | Pronunciation attempts and per-child baselines, defaults `Attempts`, `Progress`. |
| `MANAGER_EMAILS` | no | Comma-separated manager accounts; defaults to Aubrey's and Bruce's addresses. See [Manager role](#manager-role). |
| `MONGODB_DNS` | no | Dev only, e.g. `1.1.1.1,8.8.8.8` when the local DNS refuses the Atlas SRV lookup. |

Vercel: framework preset **Vite**, root directory `phoneme-prototype`, build `npm run build`,
output `dist`. The `api/` folder is picked up automatically as serverless functions.

## Session log (mode usage)

Every signed-in user's use of the Avatar / Human / Both switch is recorded in MongoDB:

- `ModeUsage` — one document per user: `{ email, userId, counts: { avatar, human, both },
  lastMode, firstAt, lastAt }`. The counters are bumped with `$inc`, so they are exact under
  concurrent tabs.
- `SessionEvents` — one row per event: `{ email, userId, event: 'start' | 'switch', mode,
  lang, at }`. `start` is the mode the app opened in, `switch` every change after that.

Endpoints (session cookie required, a user only sees their own rows): `POST /api/log/mode`,
`GET /api/log/summary`, `GET /api/log/csv`. The account menu shows the three counters and a
**Download session log (CSV)** button; the file lists the events in order with running totals
per mode (`time_utc, email, event, mode, language, avatar_total, human_total, both_total`),
UTF-8 with BOM so Excel opens it directly. Logging is fire-and-forget on the client: if the API
is unreachable the lesson still works. Code: `api/_lib/log.ts`, `src/lib/log.ts`.

## Manager role

Every account is either a **student** or a **manager**. A manager signs in through the same
page as everyone else and lands on a dashboard with every student's session activity and
progress, plus CSV exports.

**Who is a manager** is decided by email, not by anything stored on the account:
`MANAGER_EMAILS` is a comma-separated list, defaulting to `aubreycotconsulting@gmail.com` and
`brucel@blastlearning.com` (plus `bruce@blastlearning.com`, since that spelling is the one
usually written down), and the role is recomputed from the signed-in email on every request
(`roleOf` in
`api/_lib/session.ts`). So to add a manager you add their address to `MANAGER_EMAILS` and
redeploy — they do not re-register, and if they are already signed in the dashboard appears on
their next page load. Removing an address takes effect just as fast, because the session cookie
carries only the email and can never carry a stale role. The role is also never read from the
browser: the client UI hides the dashboard, and the API checks again on its own.

**The dashboard** (`src/components/ManagerDashboard.tsx`) shows totals, one row per student
(last active, Avatar / Human / Both counts, attempts, average stars, sounds practised), and, for
the selected student, the per-sound table (baseline → latest → best with the improvement), the
last 50 attempts with stars and feedback, and the last 50 mode changes. **Back to the lesson**
opens the normal lesson for a manager, and the account menu brings them back.

**Endpoints** are read-only — they only ever query, never write: `GET /api/manager/students`
(all rows and totals), `GET /api/manager/student?email=…` (one student's detail),
`GET /api/manager/csv?kind=…`. A non-manager gets `403 forbidden` from all three. Code:
`api/_lib/manager.ts`, client `src/lib/manager.ts`.

**CSV exports** — four kinds, all UTF-8 with BOM and CRLF so Excel opens them directly, named
`all-<kind>_<manager>_<date>.csv`:

| `kind` | One row per | Columns |
|---|---|---|
| `students` | account | email, role, sign-up, last login, last seen, mode counts, attempts, average stars, sounds practised |
| `progress` | student × sound | attempts, baseline, best, last, improvement, best improvement, last attempt |
| `sessions` | mode event | time, email, event, mode, language, running totals per mode |
| `attempts` | recording | time, email, sound, phase, baseline, score, improvement, stars, rank, margin, nearest other sound, duration, voiced, centroid, peak, reason, engine |

The per-student exports in the account menu and these all-student exports share one set of
writers (`api/_lib/csv.ts` plus the `*CsvLine` helpers), so the columns are identical either way.

## Theme

Light and dark themes; the sun/moon button in the top bar (and on the sign-in page) switches,
the choice is saved on the device, and the first visit follows the OS setting. All colours are
CSS tokens in `src/index.css` (`:root` / `.dark`) exposed to Tailwind as `text-ink`, `bg-panel`,
`bg-mint-bg`, `shadow-raise` …, so components never hard-code a colour.

## Practice mode and pronunciation score

After the avatar or human close-up (in every presenter mode) the lesson asks *"Do you want to see the
side and front views in more detail?"*. On **Yes** the stage splits in two: the side-view cutaway
(left) and the front view of the mouth (right), both driven by the same audio clock, so they move
in lock-step. **No** skips to the replay buttons.

In practice mode the lesson pop-up is split: the mouth close-up and side/front views on the left, a
microphone on the right. The child records (≤ 3 s), sees 1–3 animated stars with a cheer and
one line of advice (also spoken aloud), and can *Compare* their attempt with the model. **No
number is ever shown** — the users are four-year-olds. The number exists only in the database,
for the teacher's CSV and for a future AI coach that reads the measurements and gives verbal
feedback.

**How the score is measured** (`src/lib/pronounce/`, in the browser, no audio leaves the device)

1. The recording is trimmed and turned into log-mel frames (50 ms, 10 ms hop, 24 bands), each
   level-normalised, with the utterance's broad spectral tilt removed (microphone/room
   colouring) and frame-to-frame deltas appended. Frames are compared by *shape* (cosine
   distance of spectrum and deltas), which made a man's and a woman's /k/ agree.
2. It is aligned (DTW) against **every sound we teach, from every model voice** — the avatar's
   clip and the human teacher's — at seven vocal-tract-length warps (children's formants sit
   higher than an adult's).
3. The score is a **contrast**: `margin = (nearest other sound's cost − target cost) / target
   cost`, mapped by a soft sigmoid and damped by an absolute term (`SCORE` in `dsp.ts`), so a
   quiet mic or a small voice, which shift every distance together, no longer produce zeros.
   Also stored: `rank` (1 = target was the closest sound), per-sound costs, best warp, duration,
   voicing, centroid, peak level.

The manifest's `scoreRefs` lets a sound name the exact clips/windows used as references when
the clips shown to the child are not usable as-is. Today `th_voiceless` scores against the
avatar /θ/ **and** the teacher's clean /θ/; `th_voiced` scores against the avatar /ð/ only,
because no human /ð/ clip exists.

**The two human /th/ files are named the wrong way round.** `human_th_voiced.mp4` holds the
clean voiceless /θ/ and `human_th_voiceless.mp4` holds her saying the word "thin", so the
manifest deliberately crosses them over: /θ/ shows `human_th_voiced.mp4` and /ð/ shows
`human_th_voiceless.mp4`. Keep that in mind before "fixing" the mapping — and note that
`humanSpeech` and `humanPoster` belong to the file, so they move with it. Replacing the clips
with clean single-sound recordings is the real fix.

**Calibration.** Every reference clip was scored against the other speaker's references with
speed, pitch (child-voice), band-limit, noise, echo and level perturbations (144 "correct"
attempts) and against every wrong sound (100 "wrong" attempts). Result: the target ranks first
in 77 % of correct attempts (100 % for /k/ and /t/, ~95 % for /r/ and /æ/; /θ/ is the weak one
— the two /θ/ voices sit far apart and it is confused with /k/ and /t/), and in 7 % of wrong
attempts; 73 % of correct attempts score ≥ 60 vs 4 % of wrong ones. The old scorer managed
19 % rank-first across speakers. Calibration scripts live outside the repo.

**Baseline and stars** (`api/_lib/attempts.ts`, server side, so the rule is one place)

- Each attempt is `POST /api/attempts/record` with the measurements; the server stores it in
  `Attempts` and keeps `Progress` (one document per child, `sounds.<id>: { attempts, baseline,
  baselineScores, best, last }`).
- The first **three** attempts per sound are the *baseline* phase: their median becomes the
  child's hidden baseline. After that the child is *tracked*: `improvement = score − baseline`.
- Stars never drop to zero. Baseline phase: 3 stars if score ≥ 80, else 2. Tracked: 3 stars
  if the gain is ≥ 15 or the score ≥ 80; 2 if the gain is ≥ 5 or the score ≥ 60; else 1.
  The response carries `stars`, `cheerKey`, `phase`, `improvement`; the client only turns
  these into pictures and speech. Offline, the client falls back to the baseline-phase rule.
- `GET /api/attempts/summary` returns the child's progress; `GET /api/attempts/csv` exports
  every attempt (`time_utc, email, sound, phase, baseline, score, improvement, stars, rank,
  margin, target_cost, nearest_other, warp, duration_s, voiced, centroid_hz, peak_db, reason,
  engine, language`). The `engine` field (`contrast-v1`) lets the mapping change later without
  mixing old and new numbers. Audio is **not** stored.

It is still an acoustic similarity heuristic, not a phonetic assessment; `src/lib/pronounce/`
is isolated so it can be swapped for a speech-assessment API later without touching the
baseline/stars logic.

## Operator settings (URL params)

| Param | Values | Effect |
|---|---|---|
| `symbols` | `blast` (default), `alt1`, `alt2` | Which symbol system the tiles show. Placeholders until Bruce sends the three lists. |

Example: `http://localhost:5173/?symbols=alt1`

## Content manifest – `public/manifest.json`

Everything the chart shows comes from the manifest, so adding a sound means adding one
row and its assets; no component changes.

```jsonc
{
  "id": "th_voiceless",
  "ipa": "θ",
  "symbols": { "blast": "th", "alt1": "θ", "alt2": "th" },   // one per symbol system
  "exampleWord": "think",
  "cue": "thumb",                 // picture-cue name; rendered as a placeholder for now
  "color": "mint",                // mint | teal | coral | lavender | sun | sky | peach
  "audio": "audio/th_voiceless.mp3",
  "audioWindow": [1.0, 2.0],      // the part of the 3 s clip to play
  "articulation": "Tongue tip between the teeth, air only, no voice.",
  "voiced": false,                // true adds the small buzz badge (ð)
  "video": "video/avatar_th_voiceless.mp4",   // avatar mouth close-up (3 s, sound centred)
  "poster": "video/avatar_th_voiceless.jpg",  // its first frame, shown while it loads
  "scoreRefs": [                               // optional: scorer references when the shown clips won't do
    { "src": "audio/th_voiceless.mp3", "window": [1.31, 1.68] },
    { "src": "video/human_th_voiced.mp4", "window": [0.58, 1.23] }
  ],
  "tongue": { "module": "th", "sound": "θ" }  // tongue view after the close-up, or null
}
```

Words (`words[]`) list a `sequence` of sound ids whose close-ups play in order.

## Placeholders

Bruce's designer is producing the real icons. Until then:

- picture cues render through `src/components/CuePlaceholder.tsx` (dashed box + cue name);
  swap in `<img src=…>` there when the assets arrive,
- the host portrait in the header is a generic silhouette (`manifest.host.portrait: null`).

## Layout

- `src/App.tsx` – loads the manifest, reads URL params, preloads media, renders header, chart and lesson.
- `src/components/SoundChart.tsx` – the grid; a tap opens the lesson.
- `src/components/Tile.tsx` – one tile (symbol, cue, sound indicator, buzz badge).
- `src/components/Lesson.tsx` – full-screen lesson: close-up → tongue view → replay buttons.
- `src/components/palette.ts` – tile colour classes (spelled out so Tailwind emits them).
- `src/animations/th-sideview.js` – side-view tongue animation for all six sounds, and
  `src/animations/th-frontview.js` – front view of the mouth on the same keyframes. Both are copied from
  `Others/videos/tongue_anim`, where they are developed and previewed (`mouth_review.html`); copy them
  again after changes.
- `src/lib/media.ts` – preloads clips into memory so taps start instantly.
- `src/lib/useManifest.ts` – manifest fetch.
- `public/video/` – Brooke (Tavus) mouth close-ups, 768×432, 25 fps, plus first-frame posters.
- `public/audio/` – isolated sounds (3 s, sound centred), from the ElevenLabs set; played by the tongue view.
- `public/assets/girl_profile.jpg` – portrait used by the tongue view (AI-generated placeholder).

iPad note: Safari only allows sound that starts inside a tap. The lesson keeps one `<video>` and one
`<audio>` element for the whole session and starts/unlocks both in the tap handler, so the tongue
view's sound can follow the close-up without a second tap.
