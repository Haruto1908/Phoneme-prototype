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
switches, the mode-usage counters with the CSV download, and Log out.

Local: put these in `phoneme-prototype/.env.local` (git-ignored). On Vercel: Project →
Settings → Environment Variables. Never commit the values.

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | yes | Atlas connection string (user + password included). |
| `JWT_SECRET` | yes in production | Signs the session cookie. Any long random string. |
| `MONGODB_DB`, `USERS_COLLECTION` | no | Defaults `Phoneme-prototype`, `UsersTable`. |
| `USAGE_COLLECTION`, `EVENTS_COLLECTION` | no | Session log collections, defaults `ModeUsage`, `SessionEvents`. |
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

## Theme

Light and dark themes; the sun/moon button in the top bar (and on the sign-in page) switches,
the choice is saved on the device, and the first visit follows the OS setting. All colours are
CSS tokens in `src/index.css` (`:root` / `.dark`) exposed to Tailwind as `text-ink`, `bg-panel`,
`bg-mint-bg`, `shadow-raise` …, so components never hard-code a colour.

## Practice mode and pronunciation score

In practice mode the lesson pop-up is split: the mouth close-up and side view on the left, a
microphone on the right. The recording (≤ 3 s) is compared with the host's clip in the
browser (log-mel features + DTW, vocal-tract-length warps) and shown as 0–100 with a short
reason, plus a *Compare* button that plays the child then the host. It is an acoustic
similarity heuristic, not a phonetic assessment; `src/lib/pronounce/` is isolated so it can
be swapped for a speech-assessment API later.

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
- `src/animations/th-sideview.js` – /θ/ /ð/ tongue animation (copied from
  `Others/videos/tongue_anim`, where it is developed and previewed; copy it again after changes).
- `src/lib/media.ts` – preloads clips into memory so taps start instantly.
- `src/lib/useManifest.ts` – manifest fetch.
- `public/video/` – Brooke (Tavus) mouth close-ups, 768×432, 25 fps, plus first-frame posters.
- `public/audio/` – isolated sounds (3 s, sound centred), from the ElevenLabs set; played by the tongue view.
- `public/assets/girl_profile.jpg` – portrait used by the tongue view (AI-generated placeholder).

iPad note: Safari only allows sound that starts inside a tap. The lesson keeps one `<video>` and one
`<audio>` element for the whole session and starts/unlocks both in the tap handler, so the tongue
view's sound can follow the close-up without a second tap.
