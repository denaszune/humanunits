export function reusePinnedPair(pins, item, reuse) {
  reuse(item.query);
  return pins;
}

export function prependPin(pins, pair, limit = 8) {
  return [pair, ...pins].slice(0, limit);
}

export function quickReusePins(pins, limit = 3) {
  return pins.slice(0, limit);
}
