import styles from './SongCard.module.css';

/**
 * Formats a 0–100 similarity score for display.
 * @param {number} score
 * @returns {string}
 */
function formatScore(score) {
  if (!Number.isFinite(score)) return '—';
  return `${Math.round(score)}%`;
}

/**
 * A single search result.
 *
 * @param {Object} props
 * @param {string} props.name Song title.
 * @param {string} props.artist Artist name.
 * @param {number} props.score Similarity score, 0–100.
 * @param {number} [props.rank] Optional 1-based position in the result list.
 * @param {string} [props.imageUrl] Optional cover art URL.
 */
export default function SongCard({ name, artist, score, rank, imageUrl }) {
  const safeScore = Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0;

  return (
    <article className={styles.card}>
      {rank != null && <span className={styles.rank}>#{rank}</span>}

      {imageUrl ? (
        <img className={styles.cover} src={imageUrl} alt="" loading="lazy" />
      ) : (
        <div className={styles.cover} aria-hidden="true">
          ♪
        </div>
      )}

      <div className={styles.info}>
        <h2 className={styles.title} title={name}>
          {name}
        </h2>
        <p className={styles.artist} title={artist}>
          {artist}
        </p>

        <div className={styles.scoreRow}>
          <div
            className={styles.scoreTrack}
            role="img"
            aria-label={`Similarity ${formatScore(score)}`}
          >
            <div
              className={styles.scoreFill}
              style={{ width: `${safeScore}%` }}
            />
          </div>
          <span className={styles.score}>{formatScore(score)}</span>
        </div>
      </div>
    </article>
  );
}
