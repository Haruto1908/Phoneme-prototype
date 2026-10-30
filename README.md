# Phoneme prototype – sound chart

Front end for the Blast Learning phoneme prototype: a seven-tile sound chart for
kindergarten–3rd-grade children (six sounds plus the word **cat**).

Current scope: **the chart screen only**. Tapping a tile plays the sound (the *cat*
tile plays k · a · t). The mouth close-up, tongue view, Human / Avatar / Both mode,
session logging and the API are the next steps and hook in at `SoundChart.press()`.

## Run

```bash
npm install
npm run dev        # http://localhost:5173  (also reachable from an iPad on the same Wi-Fi)
npm run build      # static build in dist/
```

Stack: React 19, TypeScript, Vite, Tailwind 4. No UI framework.

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
  "voiced": false                 // true adds the small buzz badge (ð)
}
```

Words (`words[]`) list a `sequence` of sound ids played before the blended word audio.

## Placeholders

Bruce's designer is producing the real icons. Until then:

- picture cues render through `src/components/CuePlaceholder.tsx` (dashed box + cue name);
  swap in `<img src=…>` there when the assets arrive,
- the host portrait in the header is a generic silhouette (`manifest.host.portrait: null`).

## Layout

- `src/App.tsx` – loads the manifest, reads URL params, renders header + chart.
- `src/components/SoundChart.tsx` – the grid and tap handling.
- `src/components/Tile.tsx` – one tile (symbol, cue, sound indicator, buzz badge).
- `src/components/palette.ts` – tile colour classes (spelled out so Tailwind emits them).
- `src/lib/audio.ts` – preload and tap-to-play with clip windows and sequences.
- `src/lib/useManifest.ts` – manifest fetch.
- `public/audio/` – isolated sounds (3 s, sound centred), from the ElevenLabs set.
