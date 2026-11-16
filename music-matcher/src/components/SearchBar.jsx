import { useState } from 'react';
import styles from './SearchBar.module.css';

/**
 * Search input for a song name.
 *
 * @param {Object} props
 * @param {(songName: string) => void} props.onSearch Called with the trimmed song name on submit.
 * @param {string} [props.placeholder] Input placeholder text.
 * @param {boolean} [props.disabled] Disables the input and button (e.g. while loading).
 */
export default function SearchBar({
  onSearch,
  placeholder = 'Enter a song name…',
  disabled = false,
}) {
  const [query, setQuery] = useState('');

  const songName = query.trim();
  const canSubmit = !disabled && songName.length > 0;

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    onSearch(songName);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} role="search">
      <input
        className={styles.input}
        type="search"
        value={query}
        placeholder={placeholder}
        aria-label="Song name"
        autoComplete="off"
        disabled={disabled}
        onChange={(event) => setQuery(event.target.value)}
      />
      <button className={styles.button} type="submit" disabled={!canSubmit}>
        Search
      </button>
    </form>
  );
}
