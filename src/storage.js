export function readStoredCollection(storage, key, validate, limit = 8) {
  try {
    const value = JSON.parse(storage.getItem(key));
    if (!Array.isArray(value)) return [];
    return value.filter(validate).slice(0, limit);
  } catch {
    return [];
  }
}

export function writeStoredValue(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const isHistoryEntry = value => Boolean(
  value && typeof value === 'object' && typeof value.query === 'string' && typeof value.result === 'string',
);

export const isPinEntry = value => Boolean(
  value && typeof value === 'object' && typeof value.from === 'string' && typeof value.to === 'string' &&
  (value.fromCategory === undefined || typeof value.fromCategory === 'string') &&
  (value.toCategory === undefined || typeof value.toCategory === 'string'),
);
