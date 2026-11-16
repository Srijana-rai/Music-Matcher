/**
 * Pure similarity math for musiciwant's 8-dimension sensory fingerprint.
 * No network, no React — safe to unit test in isolation.
 */

/** Dimension order used by the musiciwant fingerprint endpoint. */
export const FEATURE_DIMS = [
  'intensity',
  'dynamic_range',
  'bpm',
  'sudden_changes',
  'texture',
  'predictability',
  'vocal_force',
  'miso_load',
];

/** Default per-dimension weights: everything counts equally. */
export const DEFAULT_WEIGHTS = Object.freeze(
  Object.fromEntries(FEATURE_DIMS.map((dim) => [dim, 1])),
);

/**
 * Turns a weight map into an array aligned with FEATURE_DIMS.
 * Missing or invalid weights fall back to 1.
 */
function resolveWeights(weights = DEFAULT_WEIGHTS) {
  return FEATURE_DIMS.map((dim) => {
    const value = weights?.[dim];
    return Number.isFinite(value) && value >= 0 ? value : 1;
  });
}

/**
 * Accepts a fingerprint as a keyed object or a positional array and returns
 * an array in FEATURE_DIMS order, or null when the vector is unusable.
 *
 * @param {Record<string, number>|number[]|null|undefined} vector
 * @returns {number[]|null}
 */
export function toVectorArray(vector) {
  if (!vector) return null;

  const values = Array.isArray(vector)
    ? vector.slice(0, FEATURE_DIMS.length)
    : FEATURE_DIMS.map((dim) => vector[dim]);

  if (values.length !== FEATURE_DIMS.length) return null;
  return values.every((value) => Number.isFinite(value))
    ? values.map((value) => Math.min(1, Math.max(0, value)))
    : null;
}

/**
 * Weighted cosine similarity between two fingerprints.
 *
 * Because every dimension is non-negative, the result is guaranteed to be in
 * 0–1: 1 means the fingerprints point in the same direction, 0 means they are
 * orthogonal. Magnitude is ignored — only the *shape* of the profile matters.
 *
 * @param {Record<string, number>|number[]} a
 * @param {Record<string, number>|number[]} b
 * @param {Record<string, number>} [weights]
 * @returns {number|null} Similarity, or null when either vector is invalid.
 */
export function weightedCosineSimilarity(a, b, weights = DEFAULT_WEIGHTS) {
  const left = toVectorArray(a);
  const right = toVectorArray(b);
  if (!left || !right) return null;

  const resolved = resolveWeights(weights);
  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < FEATURE_DIMS.length; i += 1) {
    const weight = resolved[i];
    dot += weight * left[i] * right[i];
    magnitudeA += weight * left[i] * left[i];
    magnitudeB += weight * right[i] * right[i];
  }

  const denominator = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
  if (denominator === 0) return null;

  return Math.min(1, Math.max(0, dot / denominator));
}

/**
 * Cosine distance (0 = identical direction, 1 = orthogonal).
 * @returns {number|null}
 */
export function cosineDistance(a, b, weights = DEFAULT_WEIGHTS) {
  const similarity = weightedCosineSimilarity(a, b, weights);
  return similarity === null ? null : 1 - similarity;
}

/**
 * Similarity between two fingerprints as a 0–100 percentage.
 * @returns {number|null} null when either vector is invalid.
 */
export function similarityScore(a, b, weights = DEFAULT_WEIGHTS) {
  const similarity = weightedCosineSimilarity(a, b, weights);
  return similarity === null ? null : similarity * 100;
}

/**
 * Ranks candidates against a seed fingerprint, closest first.
 *
 * @param {{vector?: any, vectorArray?: any, slug?: string}|any} seed
 * @param {Array<{name?: string, artist?: string, slug?: string, vector?: any, vectorArray?: any}>} candidates
 * @param {Object} [options]
 * @param {number} [options.k=12] Maximum number of results.
 * @param {Record<string, number>} [options.weights]
 * @param {boolean} [options.excludeSameSlug=true] Drop the seed itself.
 * @returns {Array<Object & {similarity: number, distance: number, score: number}>}
 */
export function rankSimilar(
  seed,
  candidates,
  { k = 12, weights = DEFAULT_WEIGHTS, excludeSameSlug = true } = {},
) {
  const seedVector =
    toVectorArray(seed?.vectorArray) ?? toVectorArray(seed?.vector);
  if (!seedVector) return [];

  return candidates
    .map((candidate) => {
      if (excludeSameSlug && candidate?.slug && candidate.slug === seed?.slug) {
        return null;
      }

      const vector =
        toVectorArray(candidate?.vector) ??
        toVectorArray(candidate?.vectorArray);
      if (!vector) return null;

      const similarity = weightedCosineSimilarity(seedVector, vector, weights);
      if (similarity === null) return null;

      return {
        ...candidate,
        similarity,
        distance: 1 - similarity,
        score: similarity * 100,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}
