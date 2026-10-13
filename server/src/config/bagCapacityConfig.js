/**
 * Single source of truth configuration for Bag capacity ranges.
 */
export const BAG_CAPACITY_CONFIG = {
  S: {
    label: 'Small',
    min: 20,
    max: 30
  },
  M: {
    label: 'Medium',
    min: 30,
    max: 50
  },
  L: {
    label: 'Large',
    min: 50,
    max: 70
  },
  XL: {
    label: 'Extra Large',
    min: 70,
    max: 90
  }
};

export const BAG_SIZE_KEYS = ['S', 'M', 'L', 'XL'];

/**
 * Normalizes size key (e.g. 'Small' -> 'S')
 */
export function normalizeBagSizeKey(sizeKey) {
  if (!sizeKey) return null;
  const clean = String(sizeKey).trim().toUpperCase();
  if (BAG_CAPACITY_CONFIG[clean]) return clean;
  if (clean === 'SMALL') return 'S';
  if (clean === 'MEDIUM') return 'M';
  if (clean === 'LARGE') return 'L';
  if (clean === 'EXTRA LARGE' || clean === 'EXTRALARGE' || clean === 'XLARGE') return 'XL';
  return null;
}

/**
 * Returns the min/max config for a bag size.
 */
export function getBagCapacityRange(sizeKey) {
  const normalized = normalizeBagSizeKey(sizeKey);
  return normalized ? BAG_CAPACITY_CONFIG[normalized] : null;
}

/**
 * Generates an array of litre strings in 1 L steps from min to max.
 * E.g. for M (30-50): ['30 L', '31 L', ..., '50 L']
 */
export function getBagCapacityOptions(sizeKey) {
  const range = getBagCapacityRange(sizeKey);
  if (!range) return [];
  const options = [];
  for (let lit = range.min; lit <= range.max; lit++) {
    options.push(`${lit} L`);
  }
  return options;
}

/**
 * Validates if a capacity value (e.g. '35 L', 35, '35') is valid for a given size.
 */
export function isValidBagCapacity(sizeKey, capacity) {
  const range = getBagCapacityRange(sizeKey);
  if (!range || capacity === undefined || capacity === null || capacity === '') return false;
  const num = parseInt(String(capacity).replace(/[^0-9]/g, ''), 10);
  if (isNaN(num)) return false;
  return num >= range.min && num <= range.max;
}

/**
 * Formats a capacity number or string uniformly to "XX L"
 */
export function formatBagCapacity(capacity) {
  if (!capacity) return null;
  const num = parseInt(String(capacity).replace(/[^0-9]/g, ''), 10);
  if (isNaN(num)) return null;
  return `${num} L`;
}
