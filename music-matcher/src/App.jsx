import { useRef, useState } from 'react';
import SearchBar from './components/SearchBar.jsx';
import SongCard from './components/SongCard.jsx';
import { getSongFeatures, MusicApiError } from './services/api.js';
import { MOCK_DB } from './services/mockDb.js';
import { rankSimilar } from './utils/similarity.js';
import './App.css';

const TOP_N = 12;

export default function App() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [seed, setSeed] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  // Guards against out-of-order responses when searches are fired quickly.
  const requestIdRef = useRef(0);

  async function handleSearch(songName) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setQuery(songName);
    setSeed(null);
    setResults([]);
    setError('');
    setStatus('loading');

    try {
      const features = await getSongFeatures(songName);
      if (requestId !== requestIdRef.current) return;

      setSeed(features);
      setResults(rankSimilar(features, MOCK_DB, { k: TOP_N }));
      setStatus('success');
    } catch (err) {
      if (requestId !== requestIdRef.current) return;

      setError(
        err instanceof MusicApiError
          ? err.message
          : 'Something went wrong while searching. Please try again.',
      );
      setStatus('error');
    }
  }

  const isLoading = status === 'loading';

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">Music Matcher</h1>
        <p className="app__subtitle">
          Find songs that sound like the one you love.
        </p>
      </header>

      <SearchBar onSearch={handleSearch} disabled={isLoading} />

      {status === 'idle' && (
        <p className="app__hint">
          Search for a song to see its closest matches.
        </p>
      )}

      {isLoading && (
        <p className="app__status" role="status" aria-live="polite">
          Finding songs similar to “{query}”…
        </p>
      )}

      {status === 'error' && (
        <p className="app__error" role="alert">
          {error}
        </p>
      )}

      {status === 'success' && seed && (
        <section className="results" aria-label="Similar songs">
          <div className="seed">
            <p className="seed__label">Seed track</p>
            <p className="seed__title">
              {seed.title}
              {seed.artist && <span className="seed__artist"> · {seed.artist}</span>}
            </p>
            <p className="seed__meta">
              {seed.tempo != null && (
                <span className="seed__chip">{seed.tempo} BPM</span>
              )}
              {seed.energy != null && (
                <span className="seed__chip">
                  {Math.round(seed.energy * 100)}% intensity
                </span>
              )}
              {seed.dims.length > 0 && (
                <span className="seed__chip">{seed.dims.length}-dim fingerprint</span>
              )}
            </p>
          </div>

          {results.length > 0 ? (
            <>
              <h2 className="results__heading">
                Top {results.length} songs similar to “{seed.title}”
              </h2>
              <ul className="results__grid">
                {results.map((song, index) => (
                  <li key={song.id}>
                    <SongCard
                      name={song.name}
                      artist={song.artist}
                      score={song.score}
                      rank={index + 1}
                    />
                  </li>
                ))}
              </ul>
              <p className="results__caption">
                Compared against a local demo catalog of {MOCK_DB.length} songs.
              </p>
            </>
          ) : (
            <p className="results__empty">
              No comparable songs found in the demo catalog.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
