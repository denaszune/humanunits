import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { movePin, prependPin, quickReusePins, reusePinnedPair } from './pins.js';

const pins = Array.from({ length: 10 }, (_, index) => ({ query: `${index} m in ft` }));

describe('pin collection helpers', () => {
  it('limits new and quick-reuse collections without mutating the source', () => {
    const next = prependPin(pins, { query: 'new' });
    assert.equal(next.length, 8);
    assert.equal(next[0].query, 'new');
    assert.equal(pins.length, 10);
    assert.deepEqual(quickReusePins(pins).map(pin => pin.query), pins.slice(0, 3).map(pin => pin.query));
  });

  it('moves valid pins and leaves invalid moves untouched', () => {
    const moved = movePin(pins, 1, -1);
    assert.notEqual(moved, pins);
    assert.equal(moved[0], pins[1]);
    assert.equal(moved[1], pins[0]);
    assert.equal(movePin(pins, 0, -1), pins);
    assert.equal(movePin(pins, pins.length - 1, 1), pins);
  });

  it('reuses the stored normalized query', () => {
    let reused;
    const item = { query: '10 km in mi' };
    assert.equal(reusePinnedPair(pins, item, query => { reused = query; }), pins);
    assert.equal(reused, item.query);
  });
});
