// Cupons validados só no front — sem conceito disso no backend ainda.
// Ver o TODO em cart.js: trocar por chamada real quando existir endpoint.
export const COUPONS = {
  POP10: { discountValue: 10 },
  RODOLFO67KAWAII: { discountValue: 670 },
  FREEBAHIA: { freeShipping: true },
  KOREANREACTIONS: { discountPercent: 50 },
  MEDA10PORFAVOR: { discountPercent: 100, freeShipping: true },
};

export function getCoupon(code) {
  if (!code) return null;
  return COUPONS[code.trim().toUpperCase()] ?? null;
}

// Sempre na mesma ordem (% do subtotal, depois valor fixo, depois frete) —
// evita carrinho e pagamento calcularem o total de jeitos diferentes.
export function computeCartTotals({ subtotal, shippingCost, coupon }) {
  const discountPercent = coupon?.discountPercent ?? 0;
  const discountValue = coupon?.discountValue ?? 0;
  const rawDiscount = subtotal * (discountPercent / 100) + discountValue;
  const discount = Math.min(rawDiscount, subtotal); // nunca deixa o subtotal ficar negativo
  const shipping = coupon?.freeShipping ? 0 : shippingCost;
  const total = subtotal - discount + shipping;
  return { discount, shipping, total };
}

const COUPON_STORAGE_KEY = "cart-coupon-code";

// guardado em sessionStorage (não no store reativo) — mesmo padrão já usado
// pro endereço selecionado no checkout, só precisa sobreviver entre cart/pagamento
export function getAppliedCouponCode() {
  return sessionStorage.getItem(COUPON_STORAGE_KEY);
}

export function setAppliedCouponCode(code) {
  if (code) sessionStorage.setItem(COUPON_STORAGE_KEY, code.trim().toUpperCase());
  else sessionStorage.removeItem(COUPON_STORAGE_KEY);
}
