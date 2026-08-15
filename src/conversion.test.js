import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { convert, evaluate, formatNumber, parseQuery, supportedPairs, supportedUnits } from './conversion.js';

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

  it('accepts clock-style and arbitrary-distance pace expressions', () => {
    assert.equal(parseQuery('7:00 min/mi to min/km')?.from.category, 'pace');
    assert.equal(parseQuery('1:20 /100 yd to /100 m')?.to.category, 'pace');
    assert.equal(parseQuery('72 sec/400 m to min/mi')?.from.category, 'pace');
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
    ['1 gal (Imp) to gal (US)', 1.2009499255], ['1 oz t to oz', 1.0971428571],
    ['5 L/100km to mpg (US)', 47.0429166], ['1 dBm to dBW', -29],
    ['1 degree Fahrenheit to kelvin', 255.9277777778], ['1 Fahrenheit difference to kelvin difference', 5 / 9],
  ]) it(`converts ${query} accurately`, () => close(evaluate(query)?.result, expected));

  it('covers scientific, electrical, radiation, thermal, and information units', () => {
    close(evaluate('1 tesla to gauss')?.result, 10000);
    close(evaluate('1 curie to becquerel')?.result, 3.7e10);
    close(evaluate('1 btu per pound to joule per kilogram')?.result, 2326);
    close(evaluate('1 nat to bit (information)')?.result, Math.LOG2E);
  });

  it('converts generalized paces and compatible pace/speed values', () => {
    close(evaluate('7:00 min/mi to min/km')?.result, 4.349598345);
    close(evaluate('4:00 min/km to min/mi')?.result, 6.437376);
    close(evaluate('1:20 /100 yd to /100 m')?.result, 87.48906387);
    close(evaluate('1:30 /100 m to /100 yd')?.result, 82.296);
    close(evaluate('1:45 /500 m to /km')?.result, 3.5);
    close(evaluate('72 sec/400 m to min/mi')?.result, 4.828032);
    close(evaluate('2:00 /200 m to /100 m')?.result, 60);
    close(evaluate('7:00 /mi to mph')?.result, 60 / 7);
    close(evaluate('4:00 /km to km/h')?.result, 15);
    close(evaluate('20 km/h to min/km')?.result, 3);
  });

  it('does not invent cross-category mass-to-molar concentration conversions', () => {
    assert.equal(evaluate('1 mg/dL to mmol/L'), null);
    assert.equal(evaluate('1 calendar month to calendar year'), null);
    assert.equal(evaluate('1 dBV to dB SPL'), null);
  });

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
  it('exposes a searchable unit catalog without generating pairs', () => {
    const catalog = supportedUnits();
    assert.equal(catalog.length, 59);
    assert.equal(catalog.reduce((total, group) => total + group.units.length, 0), 506);
    const micrometer = catalog.find(group => group.category === 'length').units.find(unit => unit.symbol === 'µm');
    assert.ok(micrometer.aliases.includes('um'));
    assert.equal(Object.hasOwn(catalog[0], 'pairs'), false);
  });

  it('puts common categories, units, and pairs first', () => {
    const catalog = supportedPairs();
    assert.deepEqual(catalog.slice(0, 6).map(group => group.category), ['length', 'temperature', 'mass', 'volume', 'area', 'speed']);
    assert.deepEqual(catalog[0].units.slice(0, 6).map(unit => unit.symbol), ['km', 'mi', 'm', 'ft', 'cm', 'in']);
    assert.deepEqual(catalog.find(group => group.category === 'pace').units.slice(0, 6).map(unit => unit.symbol), ['min/mi', 'min/km', 'sec/400 m', 'min/100 m', 'min/100 yd', 'min/500 m']);
    assert.ok(catalog[0].pairs[0].popular);
    assert.deepEqual([catalog[0].pairs[0].from.symbol, catalog[0].pairs[0].to.symbol], ['km', 'mi']);
    for (const group of catalog) {
      const firstRegularPair = group.pairs.findIndex(pair => !pair.popular);
      assert.ok(firstRegularPair < 0 || group.pairs.slice(firstRegularPair).every(pair => !pair.popular));
    }
  });

  it('lists every directed pair within each category', () => {
    const catalog = supportedPairs();
    assert.equal(catalog.length, 59);
    for (const group of catalog) {
      const sizes = Object.values(Object.groupBy(group.units, unit => unit.conversionGroup || 'linear')).map(items => items.length);
      assert.equal(group.pairs.length, sizes.reduce((total, size) => total + size * (size - 1), 0));
      assert.ok(group.pairs.every(pair => evaluate(pair.query)));
    }
    assert.equal(catalog.find(group => group.category === 'calendar duration').pairs.length, 0);
  });
});
