# Music Matcher

Type a song you love, and Music Matcher finds the tracks that *sound* like it — by comparing
audio fingerprints rather than genres or tags.

The app looks up the seed song's **8-dimension sensory fingerprint** (intensity, dynamic range,
BPM, sudden changes, texture, predictability, vocal force, miso load), computes a similarity
score against a candidate catalog, and shows the **top 12 closest matches** with a percentage score.

> The candidate catalog is currently a small local demo set (`src/services/mockDb.js`), so the app
> works with no data cost. The data source is [musiciwant](https://musiciwant.com).

## How it works

1. **Search** — the user submits a song name.
2. **Fetch the seed** — `src/services/api.js` resolves the name to a musiciwant song, then requests
   its fingerprint.
3. **Fetch candidates** — candidate fingerprints come from the catalog (local demo data for now).
4. **Score** — `src/utils/similarity.js` compares fingerprints with a weighted cosine similarity.
5. **Rank & render** — results are sorted by score, sliced to 12, and drawn as cards.

### Similarity scoring

Similarity is computed with **weighted cosine similarity** over the fingerprint vector:

```
similarity = Σ wᵢ·aᵢ·bᵢ / (√Σ wᵢ·aᵢ² · √Σ wᵢ·bᵢ²)
```

- Every dimension is normalised to `0–1`, so scores always land in `0–1` (`1` = same profile shape).
- Weights default to `1` per dimension and can be overridden per call.
- Magnitude is ignored — only the *shape* of the fingerprint matters.
- The same seed is excluded from its own results, and invalid/missing vectors are skipped.

The module is pure (no React, no network), so it can be unit tested in isolation. Exports:
`weightedCosineSimilarity`, `cosineDistance`, `similarityScore`, `rankSimilar`, `toVectorArray`,
plus `FEATURE_DIMS` and `DEFAULT_WEIGHTS`.

## Tech stack

- **React 19** with function components and hooks only
- **Vite 8** for dev server and build
- **Oxlint** for linting
- Plain CSS / CSS Modules (no CSS framework)

## Project structure

```
.
└── music-matcher/
    ├── index.html
    ├── public/
    └── src/
        ├── App.jsx                 # search state, request flow, layout
        ├── main.jsx                # entry point
        ├── components/
        │   ├── SearchBar.jsx       # controlled search form
        │   └── SongCard.jsx        # single match result
        ├── services/
        │   ├── api.js              # musiciwant client + getSongFeatures()
        │   └── mockDb.js           # local demo catalog
        └── utils/
            └── similarity.js       # pure similarity math
```

## Getting started

Requires **Node.js 20.19+** (or 22.12+) and npm.

```bash
cd music-matcher
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev
```

Then open the URL Vite prints (usually <http://localhost:5173>).

### Environment variables

Create `.env` inside `music-matcher/`:

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `VITE_MUSICIWANT_API_KEY` | No | *(empty)* | musiciwant API key. Without it you may hit rate limits. |
| `VITE_MUSICIWANT_API_BASE` | No | `https://musiciwant.com` | API base URL. |

`.env` is git-ignored; keep keys out of the repo.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server with HMR |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run Oxlint |

## Error handling

All API failures surface as a `MusicApiError` with a `code` (`NOT_FOUND`, `INVALID_API_KEY`,
`RATE_LIMITED`, `TIMEOUT`, `NETWORK_ERROR`, …) and a human-readable message shown in the UI.
Requests time out after 10 seconds, and stale responses from fast repeated searches are discarded.

## Roadmap

- Swap the local demo catalog for live musiciwant candidate lookups
- Tune per-dimension weights for better matches
- Add unit tests for the similarity module
- Add loading skeletons and result pagination

## Notes

- musiciwant does not expose Spotify-style `valence` or `danceability`, so those fields are
  returned as `null` rather than guessed. `energy` is the catalog's 0–100 intensity normalised to `0–1`.
- The deprecated Spotify `audio-features` endpoint is intentionally **not** used.
