import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { convert, evaluate, formatNumber, formatValue, parseQuery, supportedPairs, supportedUnits } from './conversion.js';
import { prependPin, quickReusePins, reusePinnedPair } from './pins.js';

function close(actual, expected, precision = 8) {
  assert.ok(Math.abs(actual - expected) < 10 ** -precision * Math.max(1, Math.abs(expected)), `${actual} is not close to ${expected}`);
}

describe('pinned-pair ordering', () => {
  const pins = [
    { from: 'km', to: 'mi', query: '1 km in mi' },
    { from: 'kg', to: 'lb', query: '1 kg in lb' },
    { from: 'C', to: 'F', query: '1 C in F' },
    { from: 'L', to: 'gal (US)', query: '1 L in gal (US)' },
  ];

  it('leaves array and persisted order unchanged when a pin is reused', () => {
    const persisted = JSON.stringify(pins);
    let selectedQuery;
    const result = reusePinnedPair(pins, pins[2], query => { selectedQuery = query; });

    assert.equal(result, pins);
    assert.equal(JSON.stringify(pins), persisted);
    assert.equal(selectedQuery, pins[2].query);
  });

  it('prepends a newly added pin', () => {
    const added = { from: 'm', to: 'ft', query: '1 m in ft' };
    assert.deepEqual(prependPin(pins, added), [added, ...pins]);
  });

  it('keeps Quick Reuse stable after selecting a pin', () => {
    const before = quickReusePins(pins);
    reusePinnedPair(pins, pins[1], () => {});
    assert.deepEqual(quickReusePins(pins), before);
  });
});

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
    assert.equal(parseQuery('4:45 minute per mile in minute per kilometer')?.from.category, 'pace');
    assert.equal(parseQuery('1:20 /100 yd to /100 m')?.to.category, 'pace');
    assert.equal(parseQuery('72 sec/400 m to min/mi')?.from.category, 'pace');
  });

  it('accepts scientific notation, signed values, unicode symbols, and the arrow connector', () => {
    close(evaluate('-2.5e3 µm → mm')?.result, -2.5);
    close(evaluate('1 m² to cm2')?.result, 10000);
    close(evaluate('1 m³ as liters')?.result, 1000);
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
    ['12 calendar months to calendar years', 1], ['2 decades to calendar years', 20],
  ]) it(`converts ${query} accurately`, () => close(evaluate(query)?.result, expected));

  it('covers scientific, electrical, radiation, thermal, and information units', () => {
    close(evaluate('1 tesla to gauss')?.result, 10000);
    close(evaluate('1 curie to becquerel')?.result, 3.7e10);
    close(evaluate('1 btu per pound to joule per kilogram')?.result, 2326);
    close(evaluate('1 nat to bit (information)')?.result, Math.LOG2E);
  });

  it('converts generalized paces and compatible pace/speed values', () => {
    close(evaluate('7:00 min/mi to min/km')?.result, 4.349598345);
    close(evaluate('4:45 minute per mile in minute per kilometer')?.result, 2.9515131631);
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
    assert.equal(formatNumber(8.88034964647626e-6, 6), '8.88035e-6');
    assert.equal(formatNumber(8.88034964647626e-6, 10), '8.880349646e-6');
    assert.equal(formatNumber(8.88034964647626e-6, 15), '8.88034964647626e-6');
    assert.equal(formatNumber(0.0001, 15), '0.0001');
    assert.equal(formatNumber(6.2137119224, 6), '6.21371');
    assert.equal(formatNumber(6.2137119224, 15), '6.2137119224');
  });

  it('round-trips a swapped conversion when the internal result is preserved', () => {
    const forward = evaluate('1 km in mi');
    const roundedReverse = evaluate(`${formatValue(forward.result, forward.to)} mi in km`);
    const fullPrecisionReverse = evaluate(`${String(forward.result)} mi in km`);
    assert.equal(formatValue(roundedReverse.result, roundedReverse.to), '0.9999999999');
    assert.equal(formatValue(fullPrecisionReverse.result, fullPrecisionReverse.to), '1');
  });

  it('formats pace results like clocks when requested', () => {
    const conversion = evaluate('4:45 minute per mile in minute per kilometer');
    assert.equal(conversion.value, 4.75);
    assert.equal(formatValue(conversion.value, conversion.from, conversion.clockStyle, 15), '4:45');
    assert.equal(formatValue(conversion.result, conversion.to, conversion.clockStyle, 6), '2:57');
    assert.equal(formatValue(conversion.result, conversion.to, conversion.clockStyle, 10), '2:57.09');
    assert.equal(formatValue(conversion.result, conversion.to, conversion.clockStyle, 15), '2:57.09079');
    assert.equal(formatValue(conversion.result, conversion.to), '2.951513163');
    const swimPace = evaluate('1:20 /100 yd to /100 m');
    assert.equal(formatValue(swimPace.result, swimPace.to, swimPace.clockStyle, 6), '1:27');
    const longPace = evaluate('90:00 min/mi in min/km');
    assert.equal(formatValue(longPace.result, longPace.to, longPace.clockStyle, 6), '55:55');
    assert.equal(formatValue(longPace.result, longPace.to, longPace.clockStyle, 10), '55:55.4');
  });

  it('uses readable scientific notation for very small conversion results', () => {
    const conversion = evaluate('23 m² in mi²');
    assert.equal(formatValue(conversion.result, conversion.to, conversion.clockStyle, 15), '8.88034964647625e-6');
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
    assert.equal(catalog[0].pairs[0].query, '1 km in mi');
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
    assert.equal(catalog.find(group => group.category === 'calendar duration').pairs.length, 30);
  });

  it('keeps special compatibility groups from becoming ordinary category-wide pairs', () => {
    const catalog = supportedPairs();
    const sound = catalog.find(group => group.category === 'sound level');
    assert.ok(sound.pairs.some(pair => pair.from.symbol === 'dBm' && pair.to.symbol === 'dBW'));
    assert.ok(!sound.pairs.some(pair => pair.from.symbol === 'dBV' && pair.to.symbol === 'dB SPL'));

    const pace = catalog.find(group => group.category === 'pace');
    assert.ok(pace.pairs.some(pair => pair.from.symbol === 'min/mi' && pair.to.symbol === 'min/km'));
    assert.ok(!pace.pairs.some(pair => pair.to.category === 'speed'));
    close(evaluate('7:00 /mi → mph')?.result, 60 / 7);
  });
});
