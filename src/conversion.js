const linear = (category, factor, aliases, symbol) => ({ category, factor, aliases, symbol });

const units = [
  linear('length', 1, ['meter', 'meters', 'metre', 'metres', 'm'], 'm'),
  linear('length', 1000, ['kilometer', 'kilometers', 'kilometre', 'kilometres', 'km', 'kms'], 'km'),
  linear('length', .01, ['centimeter', 'centimeters', 'centimetre', 'centimetres', 'cm'], 'cm'),
  linear('length', .001, ['millimeter', 'millimeters', 'millimetre', 'millimetres', 'mm'], 'mm'),
  linear('length', .0254, ['inch', 'inches', 'in'], 'in'),
  linear('length', .3048, ['foot', 'feet', 'ft'], 'ft'),
  linear('length', .9144, ['yard', 'yards', 'yd'], 'yd'),
  linear('length', 1609.344, ['mile', 'miles', 'mi'], 'mi'),
  linear('length', 1852, ['nautical mile', 'nautical miles', 'nmi'], 'nmi'),

  linear('mass', 1, ['gram', 'grams', 'g'], 'g'),
  linear('mass', 1000, ['kilogram', 'kilograms', 'kg', 'kgs', 'kilo', 'kilos'], 'kg'),
  linear('mass', .001, ['milligram', 'milligrams', 'mg'], 'mg'),
  linear('mass', 28.349523125, ['ounce', 'ounces', 'oz'], 'oz'),
  linear('mass', 453.59237, ['pound', 'pounds', 'lb', 'lbs'], 'lb'),
  linear('mass', 1000000, ['metric ton', 'metric tons', 'tonne', 'tonnes', 't'], 't'),
  linear('mass', 907184.74, ['ton', 'tons', 'short ton', 'short tons'], 'ton'),

  { category: 'temperature', aliases: ['celsius', 'centigrade', 'c', '°c'], symbol: '°C', toBase: value => value, fromBase: value => value },
  { category: 'temperature', aliases: ['fahrenheit', 'f', '°f'], symbol: '°F', toBase: value => (value - 32) * 5 / 9, fromBase: value => value * 9 / 5 + 32 },
  { category: 'temperature', aliases: ['kelvin', 'kelvins', 'k'], symbol: 'K', toBase: value => value - 273.15, fromBase: value => value + 273.15 },

  linear('volume', 1, ['liter', 'liters', 'litre', 'litres', 'l'], 'L'),
  linear('volume', .001, ['milliliter', 'milliliters', 'millilitre', 'millilitres', 'ml'], 'mL'),
  linear('volume', 3.785411784, ['gallon', 'gallons', 'gal', 'us gallon', 'us gallons'], 'gal'),
  linear('volume', .946352946, ['quart', 'quarts', 'qt'], 'qt'),
  linear('volume', .473176473, ['pint', 'pints', 'pt'], 'pt'),
  linear('volume', .0295735295625, ['fluid ounce', 'fluid ounces', 'fl oz', 'floz'], 'fl oz'),
  linear('volume', .01478676478125, ['tablespoon', 'tablespoons', 'tbsp'], 'tbsp'),
  linear('volume', .00492892159375, ['teaspoon', 'teaspoons', 'tsp'], 'tsp'),

  linear('area', 1, ['square meter', 'square meters', 'square metre', 'square metres', 'm2', 'm²', 'sq m'], 'm²'),
  linear('area', 1e6, ['square kilometer', 'square kilometers', 'km2', 'km²', 'sq km'], 'km²'),
  linear('area', .0001, ['square centimeter', 'square centimeters', 'cm2', 'cm²', 'sq cm'], 'cm²'),
  linear('area', .09290304, ['square foot', 'square feet', 'ft2', 'ft²', 'sq ft'], 'ft²'),
  linear('area', .00064516, ['square inch', 'square inches', 'in2', 'in²', 'sq in'], 'in²'),
  linear('area', 4046.8564224, ['acre', 'acres'], 'acres'),
  linear('area', 10000, ['hectare', 'hectares', 'ha'], 'ha'),
  linear('area', 2589988.110336, ['square mile', 'square miles', 'mi2', 'mi²', 'sq mi'], 'mi²'),

  linear('speed', 1, ['meter per second', 'meters per second', 'm/s', 'mps'], 'm/s'),
  linear('speed', 1 / 3.6, ['kilometer per hour', 'kilometers per hour', 'km/h', 'kph', 'kmph'], 'km/h'),
  linear('speed', .44704, ['mile per hour', 'miles per hour', 'mph', 'mi/h'], 'mph'),
  linear('speed', .514444444444, ['knot', 'knots', 'kt', 'kts'], 'kn'),

  linear('time', 1, ['second', 'seconds', 'sec', 'secs', 's'], 's'),
  linear('time', 60, ['minute', 'minutes', 'min', 'mins'], 'min'),
  linear('time', 3600, ['hour', 'hours', 'hr', 'hrs', 'h'], 'hr'),
  linear('time', 86400, ['day', 'days', 'd'], 'days'),
  linear('time', 604800, ['week', 'weeks', 'wk', 'wks'], 'weeks'),

  linear('digital storage', 1, ['byte', 'bytes', 'b'], 'B'),
  linear('digital storage', 1 / 8, ['bit', 'bits'], 'bit'),
  linear('digital storage', 1e3, ['kilobyte', 'kilobytes', 'kb'], 'KB'),
  linear('digital storage', 1e6, ['megabyte', 'megabytes', 'mb'], 'MB'),
  linear('digital storage', 1e9, ['gigabyte', 'gigabytes', 'gb'], 'GB'),
  linear('digital storage', 1e12, ['terabyte', 'terabytes', 'tb'], 'TB'),
  linear('digital storage', 1024, ['kibibyte', 'kibibytes', 'kib'], 'KiB'),
  linear('digital storage', 1048576, ['mebibyte', 'mebibytes', 'mib'], 'MiB'),
  linear('digital storage', 1073741824, ['gibibyte', 'gibibytes', 'gib'], 'GiB'),
];

const byAlias = new Map();
for (const unit of units) for (const alias of unit.aliases) byAlias.set(alias, unit);

function cleanUnit(text) {
  return text.toLowerCase().trim().replace(/^degrees?\s+/, '').replace(/\s+/g, ' ');
}

export function parseQuery(input) {
  const normalized = input.trim().replace(/[−–—]/g, '-').replace(/,/g, '');
  const match = normalized.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s+(.+?)\s+(?:in(?:to)?|to|as)\s+(.+?)\s*\??$/i);
  if (!match) return null;
  const value = Number(match[1]);
  const from = byAlias.get(cleanUnit(match[2]));
  const to = byAlias.get(cleanUnit(match[3]));
  if (!Number.isFinite(value) || !from || !to || from.category !== to.category) return null;
  return { value, from, to };
}

export function convert(value, from, to) {
  if (from.category !== to.category) throw new Error('Units must belong to the same category');
  const base = from.toBase ? from.toBase(value) : value * from.factor;
  return to.fromBase ? to.fromBase(base) : base / to.factor;
}

export function evaluate(input) {
  const parsed = parseQuery(input);
  if (!parsed) return null;
  return { ...parsed, result: convert(parsed.value, parsed.from, parsed.to) };
}

export function formatNumber(value) {
  if (!Number.isFinite(value)) return String(value);
  if (Object.is(value, -0)) value = 0;
  const magnitude = Math.abs(value);
  if (magnitude !== 0 && (magnitude >= 1e12 || magnitude < 1e-7)) return value.toExponential(8).replace(/\.0+(?=e)|(?<=\.\d*?)0+(?=e)/g, '');
  return new Intl.NumberFormat('en-US', { maximumSignificantDigits: 10 }).format(value);
}

export function pairQuery(from, to, value = 1) {
  return `${value} ${from.symbol} in ${to.symbol}`;
}
