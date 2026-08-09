import { cartService } from "../services/cart.js";
import { productService } from "../services/product.js";
import { store } from "../state/store.js";
import { navigate } from "../router.js";

export async function renderCart(container) {
  const { user } = store.getState();

  container.innerHTML = `<p class="min-h-screen flex flex-col justify-center text-center text-text/60 py-20">Carregando carrinho...</p>`;

  try {
    const cartItems = await cartService.get(user.id);
    const enriched = await enrichWithProductData(cartItems);
    render(container, user, enriched);
  } catch (err) {
    console.error(err);
  }
}

// CartItem from your API only has product.id and product.name nested —
// fetch full product details (price, image) for each item
async function enrichWithProductData(cartItems) {
  return Promise.all(
    cartItems.map(async (item) => {
      const product = await productService.getById(item.product.id);
      return { ...item, product };
    }),
  );
}

let appliedCoupon = null;

const SHIPPING_COST = 15.9;

function render(container, user, cartItems) {
  container.innerHTML = `
    <div class="max-w-5xl mx-auto my-10 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 px-4">

      <section class="border border-secondary/40 rounded-2xl overflow-hidden bg-surface h-fit">
        <header class="flex items-center gap-3 px-8 py-5 border-b border-secondary/20">
          <svg class="w-6 h-6 text-primary" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0.577816 0.033145C0.679561 0.0030607 0.786236 -0.00667994 0.891747 0.00447955C0.997258 0.015639 1.09954 0.0474799 1.19274 0.0981829C1.28594 0.148886 1.36824 0.217457 1.43493 0.299979C1.50162 0.382501 1.5514 0.477355 1.58142 0.579123L2.17368 2.58535H17.9546C19.936 2.58535 21.449 4.43435 20.8782 6.3652L19.0961 12.3957C18.717 13.6804 17.5121 14.5387 16.1725 14.5387H6.31302C4.97344 14.5387 3.76954 13.6804 3.38942 12.3957L0.0329391 1.0368C-0.0275304 0.831591 -0.00411943 0.610776 0.0980341 0.422813C0.200188 0.23485 0.372738 0.094019 0.577816 0.033145ZM4.30688 18.577C4.30688 17.9344 4.56215 17.3181 5.01652 16.8637C5.4709 16.4093 6.08717 16.154 6.72975 16.154C7.37234 16.154 7.9886 16.4093 8.44298 16.8637C8.89736 17.3181 9.15262 17.9344 9.15262 18.577C9.15262 19.2196 8.89736 19.8359 8.44298 20.2903C7.9886 20.7447 7.37234 21 6.72975 21C6.08717 21 5.4709 20.7447 5.01652 20.2903C4.56215 19.8359 4.30688 19.2196 4.30688 18.577ZM12.9215 18.577C12.9215 18.2588 12.9842 17.9438 13.106 17.6498C13.2277 17.3558 13.4062 17.0887 13.6312 16.8637C13.8562 16.6387 14.1233 16.4602 14.4172 16.3385C14.7112 16.2167 15.0262 16.154 15.3444 16.154C15.6626 16.154 15.9776 16.2167 16.2716 16.3385C16.5656 16.4602 16.8326 16.6387 17.0576 16.8637C17.2826 17.0887 17.4611 17.3558 17.5828 17.6498C17.7046 17.9438 17.7673 18.2588 17.7673 18.577C17.7673 19.2196 17.512 19.8359 17.0576 20.2903C16.6033 20.7447 15.987 21 15.3444 21C14.7018 21 14.0856 20.7447 13.6312 20.2903C13.1768 19.8359 12.9215 19.2196 12.9215 18.577Z" fill="currentColor"/>
          </svg>
          <div>
            <p class="font-semibold text-primary text-sm">Meu carrinho</p>
            <p class="text-xs text-text/50">Faça pedidos por aqui</p>
          </div>
        </header>

        <div id="cart-items" class="flex flex-col gap-4 p-6">
          ${
            cartItems.length === 0
              ? `<p class="text-center text-text/50 py-16">Seu carrinho está vazio.</p>`
              : cartItems.map((item) => cartItemRow(item)).join("")
          }
        </div>
      </section>

      ${cartItems.length > 0 ? orderSummary(cartItems) : ""}

    </div>
  `;

  setupInteractions(container, user, cartItems);
}

function cartItemRow(item) {
  return `
    <div class="flex items-center gap-4 p-4 border border-secondary/20 rounded-xl" data-item-id="${item.id}">
      <input type="checkbox" checked class="w-5 h-5 rounded border-secondary text-primary accent-primary shrink-0" />

      <div class="w-20 h-20 bg-bg rounded-lg overflow-hidden shrink-0">
        <img src="public/images/${item.product.imageUrl}.png" alt="${item.product.name}" class="w-full h-full object-cover" />
      </div>

      <div class="flex-1 min-w-0">
        <p class="font-semibold text-text text-sm truncate">${item.product.name}</p>
        <p class="text-sm text-primary font-medium mt-1">R$ ${Number(item.product.price).toFixed(2)}</p>

        <div class="flex items-center gap-4 mt-3">
          <button data-action="decrease" class="w-7 h-7 rounded-full border border-secondary text-primary hover:bg-secondary/10 transition-colors">−</button>
          <span class="qty-value text-sm text-text w-4 text-center">${item.quantity}</span>
          <button data-action="increase" class="w-7 h-7 rounded-full border border-secondary text-primary hover:bg-secondary/10 transition-colors">+</button>
          <button data-action="remove" aria-label="Remover item" class="w-7 h-7 rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center ml-2">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"></path>
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function orderSummary(cartItems) {
  const subtotal = calculateTotal(cartItems);
  const shipping = SHIPPING_COST;
  const discount = appliedCoupon?.value ?? 0;
  const total = subtotal + shipping - discount;

  return `
    <aside class="border border-secondary/40 rounded-2xl bg-surface p-6 h-fit lg:sticky lg:top-6">
      <p class="font-semibold text-primary text-sm mb-4">Resumo do pedido</p>

      <div class="flex justify-between text-sm mb-2">
        <span class="text-text/60">Subtotal (${cartItems.length} ${cartItems.length === 1 ? "item" : "itens"})</span>
        <span id="summary-subtotal">R$ ${subtotal.toFixed(2)}</span>
      </div>

      <div class="flex justify-between text-sm mb-4">
        <span class="text-text/60">Frete</span>
        <span id="summary-shipping">R$ ${shipping.toFixed(2)}</span>
      </div>

      <div class="mb-4">
        <label class="text-xs text-text/50 block mb-1">Cupom de desconto</label>
        <div class="flex gap-2">
          <input id="coupon-input" type="text" placeholder="Digite o código"
                 class="flex-1 min-w-0 border border-secondary/40 rounded-lg px-3 py-1.5 text-sm bg-bg" />
          <button id="coupon-apply" class="border border-secondary/40 rounded-lg px-3 text-sm text-primary hover:bg-secondary/10 transition-colors">Aplicar</button>
        </div>
        <p id="coupon-feedback" class="text-xs mt-1"></p>
      </div>

      <div class="border-t border-secondary/20 pt-4 flex justify-between items-baseline mb-4">
        <span class="text-sm text-text/60">Total</span>
        <span id="summary-total" class="text-lg font-bold text-primary">R$ ${total.toFixed(2)}</span>
      </div>

      <button id="checkout-btn"
              class="w-full bg-primary hover:bg-accent text-white py-3 rounded-full transition-colors">
        Finalizar compra
      </button>
    </aside>
  `;
}

function calculateTotal(cartItems) {
  return cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
}

function setupInteractions(container, user, cartItems) {
  container.querySelectorAll("[data-item-id]").forEach((row) => {
    const itemId = row.dataset.itemId;
    const item = cartItems.find((i) => String(i.id) === itemId);
    const buttons = row.querySelectorAll("button");

    row
      .querySelector('[data-action="increase"]')
      .addEventListener("click", () =>
        runRowAction(buttons, () =>
          updateQuantity(container, user, item, item.quantity + 1),
        ),
      );

    row
      .querySelector('[data-action="decrease"]')
      .addEventListener("click", () => {
        if (item.quantity <= 1) return;
        runRowAction(buttons, () =>
          updateQuantity(container, user, item, item.quantity - 1),
        );
      });

    row
      .querySelector('[data-action="remove"]')
      .addEventListener("click", () =>
        runRowAction(buttons, () => removeItem(container, user, item)),
      );
  });

  const couponBtn = container.querySelector("#coupon-apply");
  couponBtn?.addEventListener("click", () =>
    applyCoupon(container, user, cartItems),
  );

  const checkoutBtn = container.querySelector("#checkout-btn");
  checkoutBtn?.addEventListener("click", () => navigate("/checkout"));
}

async function runRowAction(buttons, action) {
  buttons.forEach((b) => (b.disabled = true));
  try {
    await action();
  } finally {
    buttons.forEach((b) => (b.disabled = false));
  }
}

function isAlreadyGone(err) {
  return /não encontrado/i.test(err.message);
}

async function updateQuantity(container, user, item, newQty) {
  try {
    await cartService.updateQuantity(user.id, item.id, newQty);
    item.quantity = newQty;
    renderCart(container); // re-fetch to keep totals in sync
  } catch (err) {
    if (isAlreadyGone(err)) {
      renderCart(container);
      return;
    }
    alert(err.message);
  }
}

async function removeItem(container, user, item) {
  try {
    await cartService.removeItem(user.id, item.id);
    renderCart(container);
  } catch (err) {
    if (isAlreadyGone(err)) {
      renderCart(container);
      return;
    }
    alert(err.message);
  }
}

async function applyCoupon(container, user, cartItems) {
  const input = container.querySelector("#coupon-input");
  const feedback = container.querySelector("#coupon-feedback");
  const code = input.value.trim();

  if (!code) return;

  const knownCoupons = { POP10: 10 };

  if (knownCoupons[code.toUpperCase()]) {
    appliedCoupon = { code, value: knownCoupons[code.toUpperCase()] };
    feedback.textContent = "Cupom aplicado";
    feedback.className = "text-xs mt-1 text-green-600";
  } else {
    appliedCoupon = null;
    feedback.textContent = "Cupom inválido";
    feedback.className = "text-xs mt-1 text-red-500";
  }

  render(container, user, cartItems);
}
