/**
 * src/utils/dealCalculator.js
 * Business logic for deal validation and discount calculation
 */

/**
 * Validate if a deal can be applied to a cart for a specific user
 * @param {Object} deal - Prisma deal object
 * @param {Object} cartData - Data about the current cart
 * @param {number} userUsageCount - Number of times user has already used this deal
 * @returns {Object} { isValid: boolean, error?: string }
 */
const validateDealEligibility = (deal, cartData, userUsageCount) => {
  const now = new Date();

  // 1. Check if deal is active
  if (!deal.isActive) {
    return { isValid: false, error: 'This deal is no longer active' };
  }

  // 2. Check validity dates
  if (now < new Date(deal.validFrom)) {
    return { isValid: false, error: 'This deal has not started yet' };
  }
  if (now > new Date(deal.validUntil)) {
    return { isValid: false, error: 'This deal has expired' };
  }

  // 3. Check restaurant match
  if (cartData.restaurantId && cartData.restaurantId !== deal.restaurantId) {
    return { isValid: false, error: 'This deal is not applicable to the selected restaurant' };
  }

  // 4. Check minimum order amount
  if (cartData.subtotal && Number(cartData.subtotal) < Number(deal.minimumOrderAmount)) {
    return {
      isValid: false,
      error: `Minimum order amount for this deal is Rs. ${deal.minimumOrderAmount}`,
    };
  }

  // 5. Check platform-wide usage limit
  // Note: usageLimit check might need a DB call for total usage count if not passed
  if (deal.usageLimit && deal._count?.usages >= deal.usageLimit) {
    return { isValid: false, error: 'This deal has reached its maximum usage limit' };
  }

  // 6. Check per-user usage limit
  if (userUsageCount >= deal.usageLimitPerUser) {
    return { isValid: false, error: 'You have already reached the maximum usage limit for this deal' };
  }

  return { isValid: true };
};

/**
 * Calculate the discount amount for a deal
 * @param {Object} deal - Prisma deal object
 * @param {number} subtotal - Cart subtotal
 * @returns {number} Discount amount
 */
const calculateDiscount = (deal, subtotal) => {
  let discount = 0;

  switch (deal.type) {
    case 'PERCENTAGE':
      discount = (Number(subtotal) * Number(deal.value)) / 100;
      if (deal.maximumDiscountAmount && discount > Number(deal.maximumDiscountAmount)) {
        discount = Number(deal.maximumDiscountAmount);
      }
      break;

    case 'FIXED_AMOUNT':
      discount = Number(deal.value);
      // Ensure discount doesn't exceed subtotal
      if (discount > Number(subtotal)) {
        discount = Number(subtotal);
      }
      break;

    case 'FREE_DELIVERY':
      // Handled in delivery fee calculation usually, but logic-wise:
      discount = 0;
      break;

    default:
      discount = 0;
  }

  return parseFloat(discount.toFixed(2));
};

module.exports = {
  validateDealEligibility,
  calculateDiscount,
};
