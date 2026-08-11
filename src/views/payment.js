import { cartService } from "../services/cart.js";
import { productService } from "../services/product.js";
import { orderService } from "../services/order.js";
import { paymentService } from "../services/payment.js";
import { store } from "../state/store.js";
import { navigate } from "../router.js";
import qrcode from "qrcode-generator";
import { getCoupon, getAppliedCouponCode, computeCartTotals } from "../utils/coupons.js";

const SHIPPING_COST = 15.9; // mesmo valor fixo usado no cart.js
const METHOD_LABELS = { PIX: "Pix", CARTAO: "Cartão", BOLETO: "Boleto" };
const STORE_PIX_KEY = "+5511999894183"; // chave da loja — chave tipo telefone precisa do +55 na frente

let selectedMethod = "PIX";
let createdOrder = null; // guardado depois da confirmação, pra permitir cancelar o pedido

export async function renderPayment(container) {
  const { user } = store.getState();
  createdOrder = null;

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
  const couponCode = getAppliedCouponCode();
  const coupon = getCoupon(couponCode);
  const { discount, shipping, total } = computeCartTotals({ subtotal, shippingCost: SHIPPING_COST, coupon });

  container.innerHTML = `
    <section class="max-w-2xl mx-auto px-6 py-10 min-h-screen">
      <button id="back-link" class="text-sm text-primary hover:underline mb-4">← Voltar ao endereço</button>

      <h1 class="text-xl font-bold text-text mb-1">Pagamento</h1>
      <p class="text-sm text-text/60 mb-6">Escolha como você quer pagar</p>

      <div class="border border-secondary/40 rounded-2xl bg-surface p-6 mb-6">
        <div class="flex justify-between text-sm mb-2">
          <span class="text-text/60">Subtotal</span>
          <span>R$ ${subtotal.toFixed(2)}</span>
        </div>
        <div class="flex justify-between text-sm mb-2">
          <span class="text-text/60">Frete</span>
          <span>${shipping === 0 ? "Grátis" : `R$ ${shipping.toFixed(2)}`}</span>
        </div>
        ${
          discount > 0
            ? `
          <div class="flex justify-between text-sm mb-2 text-primary">
            <span>Desconto (${couponCode})</span>
            <span>− R$ ${discount.toFixed(2)}</span>
          </div>
        `
            : ""
        }
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

        <div id="action-buttons">
          ${preConfirmButtons()}
        </div>
      </div>
    </section>
  `;

  attachHandlers(container, user, total);
}

function preConfirmButtons() {
  return `
    <button id="confirm-payment-btn" type="button"
            class="w-full bg-primary hover:bg-accent disabled:bg-secondary/30 text-white py-3 rounded-full mt-4 transition-colors">
      Confirmar pagamento
    </button>
    <button id="cancel-checkout-btn" type="button"
            class="w-full border border-red-200 text-red-500 hover:bg-red-50 py-3 rounded-full mt-3 transition-colors">
      Cancelar compra
    </button>
  `;
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
    return `<p class="text-sm text-text/60">Ao confirmar, você recebe um QR Code pra pagar com o app do seu banco.</p>`;
  }
  if (method === "CARTAO") {
    return `
      <div class="flex flex-col gap-2">
        <input placeholder="Número do cartão" maxlength="19"
               class="border border-secondary rounded-full px-5 py-2.5 bg-bg text-text placeholder:text-text/40 outline-none focus:border-primary transition-colors" />
        <div class="grid grid-cols-2 gap-2">
          <input placeholder="Validade (MM/AA)" maxlength="5"
                 class="border border-secondary rounded-full px-5 py-2.5 bg-bg text-text placeholder:text-text/40 outline-none focus:border-primary transition-colors" />
          <input placeholder="CVV" maxlength="4"
                 class="border border-secondary rounded-full px-5 py-2.5 bg-bg text-text placeholder:text-text/40 outline-none focus:border-primary transition-colors" />
        </div>
        <input placeholder="Nome impresso no cartão"
               class="border border-secondary rounded-full px-5 py-2.5 bg-bg text-text placeholder:text-text/40 outline-none focus:border-primary transition-colors" />
      </div>
    `;
  }
  // BOLETO
  return `<p class="text-sm text-text/60">Um boleto seria gerado com o valor total e vencimento em 3 dias úteis.</p>`;
}

function attachHandlers(container, user, total) {
  container.querySelectorAll("#method-selector button").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedMethod = btn.dataset.method;
      container.querySelector("#method-selector").innerHTML = Object.keys(METHOD_LABELS)
        .map((m) => methodButton(m))
        .join("");
      container.querySelector("#method-details").innerHTML = methodDetails(selectedMethod);
      container.querySelector("#payment-feedback")?.classList.add("hidden"); // some ao trocar de método
      attachHandlers(container, user, total); // reanexa, já que o innerHTML foi trocado
    });
  });

  container
    .querySelector("#back-link")
    ?.addEventListener("click", () => navigate("/checkout/address"));

  container
    .querySelector("#confirm-payment-btn")
    ?.addEventListener("click", () => handleConfirm(container, user, total));

  container
    .querySelector("#cancel-checkout-btn")
    ?.addEventListener("click", () => {
      // nada foi criado no backend ainda nesse ponto — só volta pro carrinho
      navigate("/cart");
    });
}

async function handleConfirm(container, user, total) {
  const feedback = container.querySelector("#payment-feedback");
  const btn = container.querySelector("#confirm-payment-btn");

  // Cartão e Boleto não têm gateway de verdade por trás — simula o processamento
  // visualmente, mas nunca cria pedido nem pagamento no backend.
  if (selectedMethod !== "PIX") {
    feedback.classList.add("hidden");
    btn.disabled = true;
    btn.textContent = "Processando pagamento...";

    await new Promise((resolve) => setTimeout(resolve, 1600));

    feedback.textContent = "Não foi possível concluir a compra.";
    feedback.classList.remove("hidden", "text-text/60");
    feedback.classList.add("text-red-500");

    btn.disabled = false;
    btn.textContent = "Confirmar pagamento";
    return;
  }

  feedback.classList.add("hidden");
  btn.disabled = true;
  btn.textContent = "Processando...";

  try {
    // só finaliza o pedido de verdade (baixa estoque) no clique de confirmar,
    // não ao simplesmente visitar a página
    const order = await orderService.checkout(user.id);
    await paymentService.create(order.id, selectedMethod);
    createdOrder = order;

    // order.total vem do backend e não inclui frete (backend não tem esse conceito) —
    // por isso usamos sempre o "total" calculado aqui no front, que já soma o frete
    await showPixQrCode(container, total);
    showPostConfirmButtons(container);
  } catch (err) {
    feedback.textContent = err.message;
    feedback.classList.remove("hidden");
    feedback.classList.add("text-red-500");
    btn.disabled = false;
    btn.textContent = "Confirmar pagamento";
  }
}

function showPostConfirmButtons(container) {
  container.querySelector("#action-buttons").innerHTML = `
    <button id="cancel-order-btn" type="button"
            class="w-full border border-red-200 text-red-500 hover:bg-red-50 py-3 rounded-full mt-4 transition-colors">
      Cancelar pedido
    </button>
    <button id="continue-shopping-btn" type="button"
            class="w-full text-sm text-primary hover:underline mt-3">
      Continuar comprando
    </button>
  `;

  container.querySelector("#cancel-order-btn").addEventListener("click", async () => {
    if (!createdOrder) return;
    const cancelBtn = container.querySelector("#cancel-order-btn");
    cancelBtn.disabled = true;
    cancelBtn.textContent = "Cancelando...";

    try {
      await orderService.cancel(createdOrder.id);
      navigate("/cart");
    } catch (err) {
      const feedback = container.querySelector("#payment-feedback");
      feedback.textContent = err.message;
      feedback.classList.remove("hidden");
      feedback.classList.add("text-red-500");
      cancelBtn.disabled = false;
      cancelBtn.textContent = "Cancelar pedido";
    }
  });

  container
    .querySelector("#continue-shopping-btn")
    .addEventListener("click", () => navigate("/catalog"));
}

async function showPixQrCode(container, amount) {
  const payload = buildPixPayload({ pixKey: STORE_PIX_KEY, amount });

  const qr = qrcode(0, "M"); // 0 = detecta o tamanho automaticamente, M = correção de erro média
  qr.addData(payload);
  qr.make();
  const qrDataUrl = qr.createDataURL(6, 8); // tamanho da célula, margem

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

// Monta o payload EMV/BR Code do Pix — o mesmo formato usado no "Pix Copia e Cola" de verdade.
// Qualquer app de banco consegue escanear isso e reconhecer chave + valor.
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
    field("00", "01") + // Payload Format Indicator
    field("26", merchantAccountInfo) + // Merchant Account Info (chave Pix)
    field("52", "0000") + // Merchant Category Code
    field("53", "986") + // Moeda: BRL
    field("54", Number(amount).toFixed(2)) + // Valor da transação
    field("58", "BR") + // País
    field("59", merchantName.slice(0, 25)) + // Nome do recebedor
    field("60", merchantCity.slice(0, 15)) + // Cidade do recebedor
    field("62", field("05", txid.slice(0, 25))); // Identificador da transação

  payload += "6304"; // ID + tamanho do campo de CRC (o valor em si vem do crc16 abaixo)
  return payload + crc16(payload);
}

// CRC16-CCITT (polinômio 0x1021, inicial 0xFFFF) — checksum exigido pelo padrão do Pix
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
