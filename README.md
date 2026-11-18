# exponential-backoff-ts

Computes the delay for a given attempt number using a base interval and optional jitter, capped at a maximum delay.

```js
import { calculateDelay } from 'exponential-backoff-ts';

// No jitter: 100ms, 200ms, 400ms, 800ms, capped at 5000ms.
const delay = calculateDelay(3, { baseDelay: 100, maxDelay: 5000 });
// 400

// With jitter: delay is scaled by a factor in [0.5, 1.5].
const jittered = calculateDelay(2, {
  baseDelay: 100,
  maxDelay: 5000,
  jitter: 0.5,
  random: () => 0.25, // deterministic for the example
});
// 150
```

## Why this exists

Retry loops need a delay that grows with the attempt number but does not grow without bound. A naive `baseDelay * 2 ** attempt` overflows to `Infinity` for large attempt counts and produces absurd sleeps. This library caps the result at `maxDelay` and clamps the exponent before multiplication so the value stays finite even for attempt numbers in the thousands.

The trade-off: jitter is a bounded multiplier in `[1 - jitter, 1 + jitter]` rather than a full random draw in `[0, delay]`. This keeps the delay predictable for scheduling and never exceeds `maxDelay`, at the cost of less spread than AWS-style "full jitter".

## Edge cases

Attempt numbers are 1-based: attempt 1 returns `baseDelay`. Non-integer, zero, and negative attempts throw `RangeError`. `jitter` must be in `[0, 1)`; `baseDelay` and `maxDelay` must be non-negative finite numbers. A custom `random` function can be supplied for deterministic tests.
