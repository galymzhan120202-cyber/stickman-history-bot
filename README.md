# project-05 — Movie/Drama Recap Shorts Engine (Animated)

Remotion (React/TypeScript) template for a faceless, English-language movie/drama
recap channel. Vertical 1080x1920, beat-synced cuts, animated captions, vivid
color grading — built as a reusable engine, not a one-off video.

## Why this niche/format

- **Fully animated background — zero film footage.** Every visual (gradient,
  particles, glowing ring) is code-generated per beat's mood. Nothing here can
  ever trigger a Content ID claim or strike, no matter which film the script
  describes — only the *words* are about the movie.
- Shorts pacing target: hook resolves in the first 3s, a visual change
  (cut/zoom/text/flash) roughly every 1.5–2s, captions on by default (60%+
  watch muted).

## Structure

- `src/MovieRecap/script.ts` — the content model (`Beat[]`). Each beat has a
  caption, narration line (for TTS), mood, and duration.
  **This is the file you edit per video.**
- `src/MovieRecap/colorGrade.ts` — mood → accent color + gradient presets.
- `src/MovieRecap/AnimatedScene.tsx` — assembles the generated background for
  one beat: gradient + glowing ring + particles + vignette.
- `src/MovieRecap/GradientBackdrop.tsx` — slow rotating/breathing mood gradient.
- `src/MovieRecap/ParticleField.tsx` — deterministic drifting particles (SVG).
- `src/MovieRecap/HookText.tsx` — big pop-in hook text for beat 1.
- `src/MovieRecap/CaptionLine.tsx` — word-by-word animated bottom captions.
- `src/MovieRecap/BeatFlash.tsx` — white flash punch on every cut.
- `src/MovieRecap/seededRandom.ts` — deterministic PRNG (Remotion renders
  frames independently/in parallel, so `Math.random()` would flicker).
- `src/MovieRecap/index.tsx` — sequences the beats, optional music bed,
  top progress bar.

## Using it for a real video

1. **Write the script** — edit `movieRecapScript` in `script.ts`. Keep beats
   short (4–6s), one idea per beat, present tense. `mood` drives the color/
   animation preset (`dread`, `tense`, `sad`, `epic`, `triumphant`).
2. **Add voiceover** — generate narration audio from each beat's `narration`
   field (e.g. via TTS), drop it in `public/audio/narration.mp3`, and add an
   `<Audio>` track in `MovieRecap/index.tsx` synced to each beat's `from`.
3. **Add music** — drop a track at `public/audio/music.mp3`; it's picked up
   automatically (see `hasMusic()` in `index.tsx`).
4. **Preview**: `npm run dev` — opens Remotion Studio, select "MovieRecap".
5. **Render**: `npx remotion render MovieRecap out/video.mp4`

### Want real footage instead/too?

If you later want to mix in actual (public-domain or licensed) clips, drop
them in `public/clips/` and render an `<OffthreadVideo>` behind or alongside
`AnimatedScene` for that beat — the caption/hook/flash/pacing layers don't
care what's behind them.

## Commands

```
npm run dev      # Remotion Studio (live preview)
npm run build    # bundle
npx remotion render MovieRecap out/video.mp4
```
