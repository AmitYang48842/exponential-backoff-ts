const DEFAULT_MAX_DELAY = 30000;
const DEFAULT_JITTER = 0;

/**
 * Computes the delay for a given attempt number using exponential backoff.
 *
 * The delay is computed as: min(maxDelay, baseDelay * 2^(attempt - 1)).
 * Attempt numbers are 1-based: attempt 1 yields baseDelay.
 *
 * Jitter is applied as a multiplier in [1 - jitter, 1 + jitter].
 * This is "full jitter" style scaling, not the AWS "full jitter" randomisation,
 * because it keeps the delay bounded and predictable for retry scheduling.
 *
 * @param {number} attempt - 1-based attempt number. Must be a positive integer.
 * @param {object} [options]
 * @param {number} [options.baseDelay=1000] - Base delay in milliseconds.
 * @param {number} [options.maxDelay=30000] - Maximum delay in milliseconds.
 * @param {number} [options.jitter=0] - Jitter fraction in [0, 1).
 * @param {() => number} [options.random=Math.random] - Random source for jitter.
 * @returns {number} Delay in milliseconds.
 */
export function calculateDelay(attempt, options = {}) {
  const {
    baseDelay = 1000,
    maxDelay = DEFAULT_MAX_DELAY,
    jitter = DEFAULT_JITTER,
    random = Math.random,
  } = options;

  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new RangeError('attempt must be a positive integer');
  }
  if (!Number.isFinite(baseDelay) || baseDelay < 0) {
    throw new RangeError('baseDelay must be a non-negative finite number');
  }
  if (!Number.isFinite(maxDelay) || maxDelay < 0) {
    throw new RangeError('maxDelay must be a non-negative finite number');
  }
  if (!Number.isFinite(jitter) || jitter < 0 || jitter >= 1) {
    throw new RangeError('jitter must be a finite number in [0, 1)');
  }
  if (typeof random !== 'function') {
    throw new TypeError('random must be a function');
  }

  // Compute the exponential term without overflowing to Infinity for large attempts.
  // 2 ** (attempt - 1) overflows to Infinity around attempt 1024, so we cap the
  // exponent before multiplication. This keeps the result finite and capped.
  const exponent = Math.min(attempt - 1, 1024);
  const raw = baseDelay * Math.pow(2, exponent);
  const capped = Math.min(raw, maxDelay);

  if (jitter === 0) {
    return capped;
  }

  // Jitter scales the capped delay by a factor in [1 - jitter, 1 + jitter].
  // We sample uniformly from that interval.
  const factor = 1 - jitter + random() * (2 * jitter);
  const jittered = capped * factor;

  // Jitter must never push the delay above maxDelay or below zero.
  return Math.max(0, Math.min(jittered, maxDelay));
}
