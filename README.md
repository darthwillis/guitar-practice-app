# Fretwork · Guitar practice

A practice coach for learning the fretboard, intervals, and improvisation. Each round follows
**prompt → attempt on the guitar → reveal → use it musically**, keeping one key and one neck
area across six steps: notes, octaves, triads, scale, constrained improvisation, and chord changes.

Built with Vite, React, and TypeScript as an installable, offline-capable PWA (no backend).

## Commands

```sh
npm install
npm run dev        # dev server (service worker disabled)
npm test           # theory, storage, and UI tests
npm run build      # typecheck + production build to dist/
npm run preview    # serve dist/ (service worker enabled)
```

## Features

- Key rotation from a chosen set of study keys, weighted toward keys you rated as hard
- Progressive reveals: key notes, tonic triad, relative major/minor and its triad, diatonic chords
- Fretboard limited to a 5-fret window (or the whole neck): hidden, roots, triad, or scale layers;
  note names or degrees; octave shape lines; tap any spot to check a note
- Web Audio metronome with count-in, PLAY/REST bars for call-and-response improvisation,
  and a I–IV–I–V loop indicator for the chord-changes step
- Self-ratings stored in `localStorage`, with JSON export/import

## iPhone / iPad

Open the deployed site in Safari → Share → **Add to Home Screen**. Notes:

- Audio starts only after tapping Start; the app sets the audio session to `playback` so the
  silent switch doesn't mute the click (Safari 16.4+).
- The screen is kept awake while the metronome runs. It stops if you lock the screen or switch apps.
- Safari can clear site data after a period of inactivity. Use **Export progress** to keep a backup.

## Deploying

`npm run build` produces static files in `dist/` with relative paths, so it works at a domain root
or a subpath (e.g. GitHub Pages). Bump `CACHE` in `public/sw.js` when changing files that aren't
content-hashed (icons, manifest).

Pushing to `main` runs `.github/workflows/pages.yml`, which tests, builds, and deploys `dist/` to
GitHub Pages (set the repository Pages source to **GitHub Actions**).
