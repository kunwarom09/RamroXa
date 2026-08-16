export const VAT_RATE = 13; // 13% Nepal VAT
export const FREE_SHIPPING_THRESHOLD = 500000; // Rs 5,000 in Paisa
export const DEFAULT_SHIPPING_FEE = 15000; // Rs 150 in Paisa

/**
 * Format integer Paisa to NPR currency string
 */
export function formatMoney(paisa) {
  const npr = Math.round((Number(paisa) || 0) / 100);
  return 'Rs ' + npr.toLocaleString('en-IN');
}

/**
 * Calculate VAT derived from a VAT-inclusive subtotal (Nepal standard retail).
 * Formula: VAT = Subtotal * (13 / 113)
 */
export function deriveVatInclusive(taxablePaisa, vatRate = VAT_RATE) {
  if (!taxablePaisa || taxablePaisa <= 0) return 0;
  return Math.round((taxablePaisa * vatRate) / (100 + vatRate));
}

/**
 * Calculate totals for a set of items with live pricing authority
 */
export function calculateOrderMath({ items, discountTotal = 0, coupon = null, freeShippingThreshold = FREE_SHIPPING_THRESHOLD, defaultShipping = DEFAULT_SHIPPING_FEE }) {
  let subtotal = 0;

  const enrichedItems = items.map((item) => {
    const unitPrice = item.unitPrice;
    const lineTotal = unitPrice * item.qty;
    subtotal += lineTotal;
    return {
      ...item,
      lineTotal
    };
  });

  // Calculate discount
  let finalDiscount = Number(discountTotal) || 0;
  if (coupon && coupon.active && !finalDiscount) {
    if (coupon.discountType === 'percentage' || coupon.type === 'percent') {
      finalDiscount = Math.round((subtotal * (coupon.discountValue || coupon.value)) / 100);
    } else if (coupon.discountType === 'fixed' || coupon.type === 'fixed') {
      finalDiscount = coupon.discountValue || coupon.value;
    }
    if (coupon.maxDiscount) {
      finalDiscount = Math.min(finalDiscount, coupon.maxDiscount);
    }
  }
  finalDiscount = Math.min(finalDiscount, subtotal);

  const discountedSubtotal = Math.max(0, subtotal - finalDiscount);

  // Shipping calculation
  const shippingTotal = discountedSubtotal >= freeShippingThreshold || discountedSubtotal === 0 ? 0 : defaultShipping;

  // Deriving VAT from VAT-inclusive subtotal
  const vatTotal = deriveVatInclusive(discountedSubtotal);

  const grandTotal = discountedSubtotal + shippingTotal;

  return {
    items: enrichedItems,
    subtotal,
    discountTotal,
    shippingTotal,
    vatTotal,
    grandTotal
  };
}

export default {
  VAT_RATE,
  FREE_SHIPPING_THRESHOLD,
  DEFAULT_SHIPPING_FEE,
  formatMoney,
  deriveVatInclusive,
  calculateOrderMath
};
