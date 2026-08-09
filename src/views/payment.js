import { cartService } from "../services/cart.js";
import { productService } from "../services/product.js";
import { orderService } from "../services/order.js";
import { paymentService } from "../services/payment.js";
import { store } from "../state/store.js";
import { navigate } from "../router.js";
import QRCode from "qrcode";

const SHIPPING_COST = 15.9;
const METHOD_LABELS = { PIX: "Pix", CARTAO: "Cartão", BOLETO: "Boleto" };

let selectedMethod = "PIX";

export async function renderPayment(container) {
  const { user } = store.getState();

  container.innerHTML = `<p class="min-h-screen flex flex-col justify-center text-center text-text/60 py-20">Carregando resumo do pedido...</p>`;

  try {
    const cartItems = await cartService.get(user.id);

    if (cartItems.length === 0) {
      navigate("/cart");
      return;
    }

    const enriched = await Promise.all(
      cartItems.map(async (item) => {
        const product = await productService.getById(item.product.id);
        return { ...item, product };
      }),
    );

    render(container, user, enriched);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="min-h-screen flex flex-col justify-center text-center text-red-500 py-20">Não foi possível carregar o pedido. Confira se o servidor está rodando e tente novamente.</p>`;
  }
}

function render(container, user, cartItems) {
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const total = subtotal + SHIPPING_COST;

  container.innerHTML = `
    <section class="max-w-2xl mx-auto px-6 py-10 min-h-screen">
      <h1 class="text-xl font-bold text-text mb-1">Pagamento</h1>
      <p class="text-sm text-text/60 mb-6">Escolha como você quer pagar</p>

      <div class="border border-secondary/40 rounded-2xl bg-surface p-6 mb-6">
        <div class="flex justify-between text-sm mb-2">
          <span class="text-text/60">Subtotal</span>
          <span>R$ ${subtotal.toFixed(2)}</span>
        </div>
        <div class="flex justify-between text-sm mb-4">
          <span class="text-text/60">Frete</span>
          <span>R$ ${SHIPPING_COST.toFixed(2)}</span>
        </div>
        <div class="border-t border-secondary/20 pt-3 flex justify-between items-baseline">
          <span class="text-sm font-medium">Total</span>
          <span class="text-lg font-bold text-primary">R$ ${total.toFixed(2)}</span>
        </div>
      </div>

      <div class="border border-secondary/40 rounded-2xl bg-surface p-6">
        <p class="font-semibold text-primary text-sm mb-4">Forma de pagamento</p>

        <div class="flex gap-2 mb-4" id="method-selector">
          ${Object.keys(METHOD_LABELS).map((m) => methodButton(m)).join("")}
        </div>

        <div id="method-details">${methodDetails(selectedMethod)}</div>

        <p id="payment-feedback" class="text-sm mt-3 hidden"></p>

        <button id="confirm-payment-btn" type="button"
                class="w-full bg-primary hover:bg-accent disabled:bg-secondary/30 text-white py-3 rounded-full mt-4 transition-colors">
          Confirmar pagamento
        </button>
      </div>
    </section>
  `;

  attachHandlers(container, user, total);
}

function methodButton(value) {
  const active = selectedMethod === value;
  return `
    <button type="button" data-method="${value}"
            class="px-4 py-2 rounded-full text-sm border transition-colors ${
              active
                ? "bg-primary text-white border-primary"
                : "border-secondary text-text hover:bg-secondary/10"
            }">
      ${METHOD_LABELS[value]}
    </button>
  `;
}

function methodDetails(method) {
  if (method === "PIX") {
    return `
      <div class="flex flex-col gap-2">
        <label class="text-xs text-text/50">Sua chave Pix (recebedor)</label>
        <input id="pix-key" required placeholder="CPF, e-mail, telefone ou chave aleatória"
               class="border border-secondary rounded-full px-5 py-2.5 bg-bg text-text placeholder:text-text/40 outline-none focus:border-primary transition-colors" />
        <p class="text-xs text-text/40">O QR Code é gerado com essa chave e o valor total do pedido.</p>
      </div>
    `;
  }
  return `<p class="text-sm text-text/60">Pagamento fica registrado como pendente — este projeto não integra com gateway de pagamento real.</p>`;
}

function attachHandlers(container, user, total) {
  container.querySelectorAll("#method-selector button").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedMethod = btn.dataset.method;
      container.querySelector("#method-selector").innerHTML = Object.keys(METHOD_LABELS)
        .map((m) => methodButton(m))
        .join("");
      container.querySelector("#method-details").innerHTML = methodDetails(selectedMethod);
      attachHandlers(container, user, total);
    });
  });

  container
    .querySelector("#confirm-payment-btn")
    .addEventListener("click", () => handleConfirm(container, user, total));
}

async function handleConfirm(container, user, total) {
  const feedback = container.querySelector("#payment-feedback");
  const btn = container.querySelector("#confirm-payment-btn");

  let pixKey = null;
  if (selectedMethod === "PIX") {
    pixKey = container.querySelector("#pix-key")?.value.trim();
    if (!pixKey) {
      feedback.textContent = "Digite sua chave Pix pra gerar o QR Code.";
      feedback.classList.remove("hidden");
      feedback.classList.add("text-red-500");
      return;
    }
  }

  feedback.classList.add("hidden");
  btn.disabled = true;
  btn.textContent = "Processando...";

  try {
    const order = await orderService.checkout(user.id);
    const payment = await paymentService.create(order.id, selectedMethod);

    if (selectedMethod === "PIX") {
      await showPixQrCode(container, pixKey, order.total ?? total);
      btn.classList.add("hidden");
    } else {
      container.querySelector("#method-details").innerHTML = `
        <p class="text-sm text-primary">Pedido #${order.id} criado! Pagamento em ${payment.status === "PENDING" ? "análise" : payment.status.toLowerCase()}.</p>
      `;
      btn.classList.add("hidden");
    }
  } catch (err) {
    feedback.textContent = err.message;
    feedback.classList.remove("hidden");
    feedback.classList.add("text-red-500");
    btn.disabled = false;
    btn.textContent = "Confirmar pagamento";
  }
}

async function showPixQrCode(container, pixKey, amount) {
  const payload = buildPixPayload({ pixKey, amount });
  const qrDataUrl = await QRCode.toDataURL(payload, { width: 240, margin: 1 });

  container.querySelector("#method-details").innerHTML = `
    <div class="flex flex-col items-center gap-3 py-2">
      <img src="${qrDataUrl}" alt="QR Code Pix para pagamento" class="rounded-lg border border-secondary/30" />
      <p class="text-sm text-text/60">Escaneie com o app do seu banco</p>

      <div class="w-full">
        <label class="text-xs text-text/50 block mb-1">Pix Copia e Cola</label>
        <div class="flex gap-2">
          <input readonly value="${payload}"
                 class="flex-1 min-w-0 border border-secondary/40 rounded-lg px-3 py-2 text-xs bg-bg text-text/70" />
          <button id="copy-pix" class="border border-secondary/40 rounded-lg px-3 text-xs text-primary hover:bg-secondary/10 transition-colors">
            Copiar
          </button>
        </div>
      </div>
    </div>
  `;

  container.querySelector("#copy-pix")?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(payload);
    const copyBtn = container.querySelector("#copy-pix");
    copyBtn.textContent = "Copiado!";
    setTimeout(() => (copyBtn.textContent = "Copiar"), 2000);
  });
}

function buildPixPayload({
  pixKey,
  amount,
  merchantName = "POP LOJA",
  merchantCity = "SAO PAULO",
  txid = "***",
}) {
  const field = (id, value) => `${id}${String(value.length).padStart(2, "0")}${value}`;

  const merchantAccountInfo = field("00", "br.gov.bcb.pix") + field("01", pixKey);

  let payload =
    field("00", "01") +
    field("26", merchantAccountInfo) +
    field("52", "0000") +
    field("53", "986") +
    field("54", Number(amount).toFixed(2)) +
    field("58", "BR") +
    field("59", merchantName.slice(0, 25)) +
    field("60", merchantCity.slice(0, 15)) +
    field("62", field("05", txid.slice(0, 25)));

  payload += "6304";
  return payload + crc16(payload);
}

function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
