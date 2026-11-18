import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateDelay } from '../src/core.js';

// Deterministic random source: returns values from a fixed sequence.
function sequenceRandom(values) {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

test('attempt 1 returns baseDelay', () => {
  assert.equal(calculateDelay(1, { baseDelay: 100 }), 100);
});

test('attempt 2 doubles the base delay', () => {
  assert.equal(calculateDelay(2, { baseDelay: 100 }), 200);
});

test('attempt 3 quadruples the base delay', () => {
  assert.equal(calculateDelay(3, { baseDelay: 100 }), 400);
});

test('delay is capped at maxDelay', () => {
  assert.equal(calculateDelay(10, { baseDelay: 100, maxDelay: 500 }), 500);
});

test('maxDelay caps even when baseDelay already exceeds it', () => {
  assert.equal(calculateDelay(1, { baseDelay: 1000, maxDelay: 200 }), 200);
});

test('large attempt numbers stay finite and capped', () => {
  const delay = calculateDelay(2000, { baseDelay: 100, maxDelay: 5000 });
  assert.equal(delay, 5000);
  assert.ok(Number.isFinite(delay));
});

test('jitter with random() = 0 returns the lower bound', () => {
  const delay = calculateDelay(1, {
    baseDelay: 100,
    jitter: 0.5,
    random: sequenceRandom([0]),
  });
  assert.equal(delay, 50);
});

test('jitter with random() = 1 returns the upper bound', () => {
  const delay = calculateDelay(1, {
    baseDelay: 100,
    jitter: 0.5,
    random: sequenceRandom([1]),
  });
  assert.equal(delay, 150);
});

test('jitter with random() = 0.5 returns the capped delay unchanged', () => {
  const delay = calculateDelay(1, {
    baseDelay: 100,
    jitter: 0.5,
    random: sequenceRandom([0.5]),
  });
  assert.equal(delay, 100);
});

test('jitter never pushes the delay above maxDelay', () => {
  const delay = calculateDelay(10, {
    baseDelay: 100,
    maxDelay: 500,
    jitter: 0.5,
    random: sequenceRandom([1]),
  });
  assert.equal(delay, 500);
});

test('jitter never pushes the delay below zero', () => {
  // baseDelay 1 with jitter 0.9 and random 0 gives 1 * (1 - 0.9) = 0.1,
  // within floating-point rounding.
  const delay = calculateDelay(1, {
    baseDelay: 1,
    jitter: 0.9,
    random: sequenceRandom([0]),
  });
  assert.equal(delay, 1 * (1 - 0.9));
  assert.ok(delay >= 0);
});

test('zero jitter returns the exact capped delay', () => {
  assert.equal(calculateDelay(5, { baseDelay: 10, maxDelay: 1000, jitter: 0 }), 160);
});

test('rejects non-positive attempt numbers', () => {
  assert.throws(() => calculateDelay(0), RangeError);
  assert.throws(() => calculateDelay(-1), RangeError);
  assert.throws(() => calculateDelay(1.5), RangeError);
});

test('rejects invalid jitter values', () => {
  assert.throws(() => calculateDelay(1, { jitter: -0.1 }), RangeError);
  assert.throws(() => calculateDelay(1, { jitter: 1 }), RangeError);
  assert.throws(() => calculateDelay(1, { jitter: Infinity }), RangeError);
});

test('rejects invalid baseDelay and maxDelay', () => {
  assert.throws(() => calculateDelay(1, { baseDelay: -1 }), RangeError);
  assert.throws(() => calculateDelay(1, { baseDelay: Infinity }), RangeError);
  assert.throws(() => calculateDelay(1, { maxDelay: -1 }), RangeError);
  assert.throws(() => calculateDelay(1, { maxDelay: NaN }), RangeError);
});

test('rejects a non-function random source', () => {
  assert.throws(() => calculateDelay(1, { random: 42 }), TypeError);
});
