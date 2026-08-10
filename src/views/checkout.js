import { cartService } from "../services/cart.js";
import { productService } from "../services/product.js";
import { addressService } from "../services/adress.js";
import { orderService } from "../services/order.js";
import { paymentService } from "../services/payment.js";
import { store } from "../state/store.js";
import { navigate } from "../router.js";
import { imageSrc } from "../utils/image.js";

const PAYMENT_METHODS = [
  { value: "PIX", label: "Pix" },
  { value: "CREDIT_CARD", label: "Cartão de crédito" },
  { value: "DEBIT_CARD", label: "Cartão de débito" },
  { value: "BOLETO", label: "Boleto bancário" },
];

const FIELDS = [
  { name: "fullName", label: "Nome completo", type: "text", autocomplete: "name" },
  { name: "zipCode", label: "CEP", type: "text", autocomplete: "postal-code", hint: "Somente números, 8 dígitos" },
  { name: "street", label: "Rua", type: "text", autocomplete: "address-line1" },
  { name: "number", label: "Número", type: "text", autocomplete: "address-line2" },
  { name: "city", label: "Cidade", type: "text", autocomplete: "address-level2" },
  { name: "state", label: "Estado (UF)", type: "text", autocomplete: "address-level1", hint: "Duas letras, ex.: SP" },
];

export async function renderCheckout(container) {
  const { user } = store.getState();

  container.innerHTML = statusScreen("Carregando seu pedido...");

  try {
    const items = await cartService.get(user.id);
    if (items.length === 0) {
      container.innerHTML = emptyScreen();
      return;
    }
    const detailed = await withProductDetails(items);
    renderForm(container, user, detailed);
  } catch (err) {
    container.innerHTML = errorScreen(
      "Não conseguimos carregar seu carrinho.",
      err.message,
    );
    container.querySelector("#retry-btn").addEventListener("click", () => renderCheckout(container));
  }
}

// O CartItem traz o produto só com id e nome; preço e imagem vêm do detalhe.
async function withProductDetails(items) {
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      product: await productService.getById(item.product.id),
    })),
  );
}

function total(items) {
  return items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
}

function renderForm(container, user, items) {
  container.innerHTML = `
    <section class="max-w-3xl mx-auto px-6 py-10">
      <h1 class="text-2xl font-bold text-text">Finalizar compra</h1>

      <div class="grid grid-cols-1 md:grid-cols-5 gap-8 mt-8">
        <form id="checkout-form" novalidate class="md:col-span-3 flex flex-col gap-5">
          <fieldset class="flex flex-col gap-5 border border-secondary/40 rounded-2xl p-6">
            <legend class="px-2 text-sm font-semibold text-primary">Entrega</legend>
            ${FIELDS.map(field).join("")}
          </fieldset>

          <fieldset class="border border-secondary/40 rounded-2xl p-6">
            <legend class="px-2 text-sm font-semibold text-primary">Pagamento</legend>
            <label for="method" class="block text-sm text-text mb-1.5">Forma de pagamento</label>
            <select id="method" name="method" required
                    aria-describedby="method-error"
                    class="w-full border border-secondary rounded-xl px-4 py-2.5 bg-surface text-text focus:border-primary">
              <option value="">Selecione...</option>
              ${PAYMENT_METHODS.map((m) => `<option value="${m.value}">${m.label}</option>`).join("")}
            </select>
            <p id="method-error" class="text-sm text-danger mt-1.5 hidden" role="alert"></p>
            <p class="text-xs text-muted mt-3">
              Simulação acadêmica: nenhum dado bancário é solicitado ou processado.
            </p>
          </fieldset>

          <p id="form-error" class="text-sm text-danger hidden" role="alert"></p>

          <button type="submit" id="submit-btn"
                  class="w-full bg-primary hover:bg-accent text-white py-3.5 rounded-full transition-colors disabled:opacity-60">
            Confirmar pedido
          </button>
        </form>

        ${summary(items)}
      </div>
    </section>
  `;

  const nameInput = container.querySelector("#fullName");
  if (nameInput && user.name) nameInput.value = user.name;

  container
    .querySelector("#checkout-form")
    .addEventListener("submit", (e) => handleSubmit(e, container, user, items));
}

function field({ name, label, type, autocomplete, hint }) {
  return `
    <div>
      <label for="${name}" class="block text-sm text-text mb-1.5">${label}</label>
      <input type="${type}" id="${name}" name="${name}" autocomplete="${autocomplete}"
             aria-describedby="${hint ? `${name}-hint ` : ""}${name}-error"
             class="w-full border border-secondary rounded-xl px-4 py-2.5 bg-surface text-text placeholder:text-muted focus:border-primary" />
      ${hint ? `<p id="${name}-hint" class="text-xs text-muted mt-1">${hint}</p>` : ""}
      <p id="${name}-error" class="text-sm text-danger mt-1.5 hidden" role="alert"></p>
    </div>
  `;
}

function summary(items) {
  return `
    <aside aria-labelledby="summary-title" class="md:col-span-2 h-fit border border-secondary/40 rounded-2xl p-6 bg-surface">
      <h2 id="summary-title" class="text-sm font-semibold text-primary">Resumo</h2>
      <ul class="flex flex-col gap-4 mt-4">
        ${items
          .map(
            (item) => `
          <li class="flex gap-3 items-center">
            <img src="${imageSrc(item.product.imageUrl)}" alt="" loading="lazy"
                 class="w-12 h-12 rounded-lg object-cover bg-bg shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-sm text-text truncate">${item.product.name}</p>
              <p class="text-xs text-muted">${item.quantity} × R$ ${Number(item.product.price).toFixed(2)}</p>
            </div>
          </li>`,
          )
          .join("")}
      </ul>
      <div class="flex justify-between items-center mt-6 pt-4 border-t border-secondary/30">
        <span class="text-sm text-muted">Total</span>
        <span class="text-lg font-bold text-primary">R$ ${total(items).toFixed(2)}</span>
      </div>
    </aside>
  `;
}

function validate(data) {
  const errors = {};

  if (data.fullName.trim().length < 3) errors.fullName = "Informe seu nome completo.";
  if (!/^\d{8}$/.test(data.zipCode.replace(/\D/g, ""))) errors.zipCode = "O CEP deve ter 8 dígitos.";
  if (!data.street.trim()) errors.street = "Informe a rua.";
  if (!data.number.trim()) errors.number = "Informe o número.";
  if (!data.city.trim()) errors.city = "Informe a cidade.";
  if (!/^[A-Za-z]{2}$/.test(data.state.trim())) errors.state = "Use a sigla de 2 letras, ex.: SP.";
  if (!data.method) errors.method = "Escolha uma forma de pagamento.";

  return errors;
}

function showErrors(container, errors) {
  [...FIELDS.map((f) => f.name), "method"].forEach((name) => {
    const input = container.querySelector(`#${name}`);
    const errorEl = container.querySelector(`#${name}-error`);
    const message = errors[name];

    errorEl.textContent = message || "";
    errorEl.classList.toggle("hidden", !message);
    input.setAttribute("aria-invalid", message ? "true" : "false");
    input.classList.toggle("border-danger", Boolean(message));
  });

  // Leitor de tela e teclado vão direto para o primeiro campo com problema.
  const first = Object.keys(errors)[0];
  if (first) container.querySelector(`#${first}`).focus();
}

async function handleSubmit(event, container, user, items) {
  event.preventDefault();

  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  const errors = validate(data);

  showErrors(container, errors);
  if (Object.keys(errors).length > 0) return;

  const button = container.querySelector("#submit-btn");
  const formError = container.querySelector("#form-error");

  button.disabled = true;
  button.textContent = "Processando...";
  formError.classList.add("hidden");

  try {
    await addressService.add(user.id, {
      street: data.street.trim(),
      number: data.number.trim(),
      city: data.city.trim(),
      state: data.state.trim().toUpperCase(),
      zipCode: data.zipCode.replace(/\D/g, ""),
    });

    const order = await orderService.checkout(user.id);

    // Só criamos o pagamento (fica PENDING). As transições process/approve/decline
    // exigem ROLE_ADMIN no backend — representam a autoridade do gateway, não do
    // comprador. Um administrador (ou o mock do gateway) finaliza depois.
    await paymentService.create(order.id, data.method);

    store.setState({ cart: [] });
    renderConfirmation(container, order, data.method);
  } catch (err) {
    formError.textContent = err.message || "Não foi possível concluir o pedido.";
    formError.classList.remove("hidden");
    formError.focus();
    button.disabled = false;
    button.textContent = "Confirmar pedido";
  }
}

function renderConfirmation(container, order, method) {
  const label = PAYMENT_METHODS.find((m) => m.value === method)?.label || method;

  container.innerHTML = `
    <section class="max-w-xl mx-auto px-6 py-10 min-h-screen" aria-live="polite">
      <div class="border border-secondary/40 rounded-2xl p-8 bg-surface text-center">
        <p class="text-4xl" aria-hidden="true">✓</p>
        <h1 tabindex="-1" class="text-2xl font-bold text-text mt-3">Pedido confirmado</h1>
        <p class="text-sm text-muted mt-2">
          Obrigado! Seu pedido foi registrado e o pagamento por ${label} está aguardando confirmação.
        </p>

        <dl class="text-left mt-8 flex flex-col gap-3">
          <div class="flex justify-between border-b border-secondary/20 pb-2">
            <dt class="text-sm text-muted">Número do pedido</dt>
            <dd class="text-sm font-semibold text-text">#${order.id}</dd>
          </div>
          <div class="flex justify-between border-b border-secondary/20 pb-2">
            <dt class="text-sm text-muted">Total</dt>
            <dd class="text-sm font-semibold text-primary">R$ ${Number(order.total).toFixed(2)}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-sm text-muted">Pagamento</dt>
            <dd class="text-sm font-semibold text-text">${label}</dd>
          </div>
        </dl>

        <div class="flex flex-col sm:flex-row gap-3 mt-8">
          <a href="/catalog" data-link
             class="flex-1 bg-primary hover:bg-accent text-white py-3 rounded-full transition-colors">
            Continuar comprando
          </a>
          <a href="/" data-link
             class="flex-1 border border-primary text-primary hover:bg-primary/5 py-3 rounded-full transition-colors">
            Voltar à home
          </a>
        </div>
      </div>
    </section>
  `;

  container.querySelector("h1").focus?.();
}

function statusScreen(message) {
  return `<section class="min-h-screen flex items-center justify-center" aria-live="polite">
            <p class="text-muted">${message}</p>
          </section>`;
}

function emptyScreen() {
  return `
    <section class="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 class="text-xl font-bold text-text">Seu carrinho está vazio</h1>
      <p class="text-sm text-muted">Adicione produtos antes de finalizar a compra.</p>
      <a href="/catalog" data-link class="bg-primary hover:bg-accent text-white px-6 py-3 rounded-full transition-colors">
        Ver catálogo
      </a>
    </section>
  `;
}

function errorScreen(title, detail) {
  return `
    <section class="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center" role="alert">
      <h1 class="text-xl font-bold text-text">${title}</h1>
      <p class="text-sm text-muted">${detail || ""}</p>
      <button id="retry-btn" type="button"
              class="bg-primary hover:bg-accent text-white px-6 py-3 rounded-full transition-colors">
        Tentar de novo
      </button>
    </section>
  `;
}
