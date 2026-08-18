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

export function movePin(pins, index, direction) {
  const destination = index + direction;
  if (index < 0 || index >= pins.length || destination < 0 || destination >= pins.length) return pins;
  const reordered = [...pins];
  [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
  return reordered;
}
