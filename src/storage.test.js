import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isHistoryEntry, isPinEntry, readStoredCollection, writeStoredValue } from './storage.js';

const storageWith = value => ({ getItem: () => value });

describe('local storage boundaries', () => {
  it('accepts only valid history records and enforces the collection limit', () => {
    const valid = Array.from({ length: 10 }, (_, index) => ({ query: `${index} m to ft`, result: `${index} ft` }));
    const stored = JSON.stringify([null, {}, ...valid, { query: 1, result: 'bad' }]);
    assert.deepEqual(readStoredCollection(storageWith(stored), 'history', isHistoryEntry), valid.slice(0, 8));
  });

  it('accepts legacy and category-qualified pins but rejects malformed records', () => {
    const legacy = { from: 'mm', to: 'in', query: '10 mm in in' };
    const qualified = { from: 'mm', to: 'in', fromCategory: 'typography', toCategory: 'typography' };
    const stored = JSON.stringify([legacy, qualified, null, { from: 'm' }, { from: 'm', to: 'ft', fromCategory: 2 }]);
    assert.deepEqual(readStoredCollection(storageWith(stored), 'pins', isPinEntry), [legacy, qualified]);
  });

  for (const [label, storage] of [
    ['missing values', storageWith(null)],
    ['non-array JSON', storageWith('null')],
    ['malformed JSON', storageWith('{')],
    ['blocked storage', { getItem: () => { throw new Error('blocked'); } }],
  ]) it(`returns an empty collection for ${label}`, () => {
    assert.deepEqual(readStoredCollection(storage, 'key', () => true), []);
  });

  it('reports storage write success without leaking storage failures', () => {
    let written;
    assert.equal(writeStoredValue({ setItem: (key, value) => { written = [key, value]; } }, 'key', { ok: true }), true);
    assert.deepEqual(written, ['key', '{"ok":true}']);
    assert.equal(writeStoredValue({ setItem: () => { throw new Error('quota'); } }, 'key', []), false);
  });
});
