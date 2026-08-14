import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { convert, evaluate, formatNumber, parseQuery, supportedPairs } from './conversion.js';

function close(actual, expected, precision = 8) {
  assert.ok(Math.abs(actual - expected) < 10 ** -precision * Math.max(1, Math.abs(expected)), `${actual} is not close to ${expected}`);
}

describe('natural-language parser', () => {
  for (const [query, category] of [
    ['10 km in miles', 'length'], ['72 f to c', 'temperature'], ['1 square mile into acres', 'area'],
    ['2 HOURS as minutes?', 'time'], ['1,024 bytes to kib', 'digital storage'], ['.5 gallons in ml', 'volume'],
  ]) it(`parses ${query}`, () => assert.equal(parseQuery(query)?.from.category, category));

  it('accepts plurals, degree labels, and unicode minus', () => {
    close(evaluate('−40 degrees Fahrenheit to celsius')?.result, -40);
  });

  for (const query of ['hello', '10 km', '1 kg to miles', 'NaN m to ft', '']) it(`rejects invalid query ${query}`, () => {
    assert.equal(parseQuery(query), null);
  });
});

describe('conversion engine', () => {
  for (const [query, expected] of [
    ['10 km in miles', 6.2137119224], ['1 lb to grams', 453.59237], ['32 f to c', 0],
    ['100 c to f', 212], ['1 gallon to liters', 3.785411784], ['1 acre to sq ft', 43560],
    ['60 mph to m/s', 26.8224], ['2 days to hours', 48], ['1 GiB to MB', 1073.741824],
  ]) it(`converts ${query} accurately`, () => close(evaluate(query)?.result, expected));

  it('throws for incompatible direct conversions', () => {
    const length = parseQuery('1 m to ft').from;
    const mass = parseQuery('1 kg to lb').from;
    assert.throws(() => convert(1, length, mass));
  });

  it('formats useful precision without negative zero', () => {
    assert.equal(formatNumber(6.2137119224), '6.213711922');
    assert.equal(formatNumber(-0), '0');
    assert.equal(formatNumber(1.25e12), '1.25e+12');
    assert.equal(formatNumber(1.25e-8), '1.25e-8');
  });
});

describe('supported pairs catalog', () => {
  it('lists every directed pair within each category', () => {
    const catalog = supportedPairs();
    assert.equal(catalog.length, 8);
    for (const group of catalog) {
      assert.equal(group.pairs.length, group.units.length * (group.units.length - 1));
      assert.ok(group.pairs.every(pair => evaluate(pair.query)));
    }
  });
});
