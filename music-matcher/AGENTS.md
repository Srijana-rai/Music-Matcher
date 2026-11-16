# AGENTS.md

## Project

React + Vite (JavaScript, JSX). Entry point is `src/main.jsx`, root component is `src/App.jsx`.

## Stack conventions

- Use **functional components** and **Hooks** only. No class components.
- Styling: **CSS Modules** (`*.module.css`) or plain CSS (`*.css`). **Do not add Tailwind** or any other CSS framework for now.
- Keep components small and co-located with their styles.

## Core functionality

The app lets the user type a song name, looks up that song's audio features via the API, computes similarity against other songs, and renders the **top 12 most similar songs**.

Planned flow:

1. User submits a song name (search input + form).
2. Fetch the seed track and its audio features.
3. Fetch candidate tracks and their audio features.
4. Compute a similarity score from the audio features.
5. Sort by score descending and display the top 12 results.

Design the similarity function so it is pure and testable, and keep it in a separate module rather than inside a component.

## Data source

- Use **musiciwant** as the data source. The actual API calls will be implemented later — until then, keep the network layer behind a small module (e.g. `src/api/`) so the UI can be built against a stable interface.
- **Do not** use the deprecated Spotify official `audio-features` endpoint (or any other deprecated Spotify audio-features API).

## Notes for agents

- Prefer editing existing files over restructuring the scaffold.
- Do not introduce new dependencies without a clear reason; ask first if a dependency seems necessary.
- Keep `npm run dev` working; verify with `npm run lint` / `npm run build` after non-trivial changes.
