/**
 * Convert decimal dollars to CardPointe cents string.
 * "$25.00" → "2500", 25 → "2500", 2500 → "2500"
 */
function toCents(amount) {
  if (typeof amount === 'string' && /^\d+$/.test(amount)) {
    return amount;
  }

  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (Number.isNaN(num)) {
    throw new Error(`Invalid amount: ${amount}`);
  }

  // GHL sends decimal (100.00); CardPointe expects cents as string
  if (Number.isInteger(num) && num >= 100) {
    return String(num);
  }

  return String(Math.round(num * 100));
}

/**
 * Convert CardPointe cents to decimal for GHL responses.
 */
function fromCents(cents) {
  const num = typeof cents === 'string' ? parseInt(cents, 10) : cents;
  return num / 100;
}

module.exports = { toCents, fromCents };
