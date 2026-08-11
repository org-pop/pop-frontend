import { addressService } from "../services/adress.js";
import { store } from "../state/store.js";
import { navigate } from "../router.js";
import { UFS } from "../utils/brazil-states.js";
import { isSameAddress } from "../utils/address-utils.js";
import { escapeHtml } from "../utils/html.js";

export async function renderAddress(container) {
  const { user } = store.getState();

  container.innerHTML = `<p class="min-h-screen flex flex-col justify-center text-center text-text/70 py-20">Carregando endereços...</p>`;

  let addresses = [];
  try {
    addresses = await addressService.getByUser(user.id);
  } catch (err) {
    console.error(err);
  }

  render(container, user, addresses, { showForm: addresses.length === 0 });
}

function render(container, user, addresses, { showForm }) {
  container.innerHTML = `
    <section class="max-w-2xl mx-auto px-6 py-10 min-h-screen">
      <button id="back-to-cart" class="text-sm text-primary hover:underline mb-4">← Voltar ao carrinho</button>

      <h1 class="text-xl font-bold text-text mb-1">Endereço de entrega</h1>
      <p class="text-sm text-text/70 mb-6">Escolha um endereço salvo ou cadastre um novo</p>

      ${
        addresses.length > 0
          ? `
        <div class="flex flex-col gap-3 mb-6">
          ${addresses.map((addr) => addressCard(addr)).join("")}
        </div>
      `
          : ""
      }

      ${
        showForm
          ? `
        <div class="border border-secondary/40 rounded-2xl bg-surface p-6">
          <p class="font-semibold text-primary text-sm mb-4">Novo endereço</p>

          <form id="address-form" class="flex flex-col gap-3">
            <div class="grid grid-cols-[1fr_100px] gap-3">
              <input id="zipCode" required placeholder="CEP" aria-label="CEP" maxlength="9"
                     class="border border-secondary rounded-full px-5 py-2.5 bg-bg text-text placeholder:text-text/40 outline-none focus:border-primary transition-colors" />
              <select id="state" required aria-label="Estado (UF)"
                      class="border border-secondary rounded-full px-5 py-2.5 bg-bg text-text outline-none focus:border-primary transition-colors">
                <option value="" disabled selected>UF</option>
                ${UFS.map((uf) => `<option value="${uf}">${uf}</option>`).join("")}
              </select>
            </div>

            <input id="city" required placeholder="Cidade" aria-label="Cidade"
                   class="border border-secondary rounded-full px-5 py-2.5 bg-bg text-text placeholder:text-text/40 outline-none focus:border-primary transition-colors" />

            <div class="grid grid-cols-[1fr_120px] gap-3">
              <input id="street" required placeholder="Rua" aria-label="Rua"
                     class="border border-secondary rounded-full px-5 py-2.5 bg-bg text-text placeholder:text-text/40 outline-none focus:border-primary transition-colors" />
              <input id="number" required placeholder="Número" aria-label="Número"
                     class="border border-secondary rounded-full px-5 py-2.5 bg-bg text-text placeholder:text-text/40 outline-none focus:border-primary transition-colors" />
            </div>

            <p id="address-feedback" class="text-sm mt-1 hidden"></p>

            <div class="flex items-center gap-3 mt-2">
              ${
                addresses.length > 0
                  ? `
                <button type="button" id="cancel-new-address"
                        class="text-text/70 hover:text-text text-sm px-2">
                  Cancelar
                </button>
              `
                  : ""
              }
              <button type="submit"
                      class="flex-1 bg-primary hover:bg-accent text-white py-3 rounded-full transition-colors">
                Salvar e continuar
              </button>
            </div>
          </form>
        </div>
      `
          : `
        <button type="button" id="show-address-form" class="text-sm text-primary hover:underline">
          + Adicionar novo endereço
        </button>
      `
      }
    </section>
  `;

  setupInteractions(container, user, addresses, showForm);
}

function addressCard(addr) {
  return `
    <label class="flex items-start gap-3 border border-secondary/30 rounded-xl p-4 cursor-pointer hover:border-primary transition-colors">
      <input type="radio" name="selected-address" value="${addr.id}" class="mt-1 accent-primary" />
      <span class="text-sm text-text">
        ${escapeHtml(addr.street)}, ${escapeHtml(addr.number)} — ${escapeHtml(addr.city)}/${escapeHtml(addr.state)}<br />
        <span class="text-text/70">CEP ${escapeHtml(addr.zipCode)}</span>
      </span>
    </label>
  `;
}

function setupInteractions(container, user, addresses, showForm) {
  container.querySelector("#back-to-cart")?.addEventListener("click", () => navigate("/cart"));

  container.querySelectorAll('input[name="selected-address"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      // guarda só nessa sessão do navegador — hoje o backend não vincula
      // endereço ao pedido, então isso é usado só pra UI por enquanto
      sessionStorage.setItem("checkout-address-id", radio.value);
      navigate("/checkout/payment");
    });
  });

  container.querySelector("#show-address-form")?.addEventListener("click", () => {
    render(container, user, addresses, { showForm: true });
  });

  container.querySelector("#cancel-new-address")?.addEventListener("click", () => {
    render(container, user, addresses, { showForm: false });
  });

  const form = container.querySelector("#address-form");
  const feedback = container.querySelector("#address-feedback");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const address = {
      street: container.querySelector("#street").value.trim(),
      number: container.querySelector("#number").value.trim(),
      city: container.querySelector("#city").value.trim(),
      state: container.querySelector("#state").value,
      zipCode: container.querySelector("#zipCode").value.trim(),
    };

    if (addresses.some((a) => isSameAddress(a, address))) {
      feedback.textContent = "Esse endereço já está cadastrado.";
      feedback.classList.remove("hidden");
      feedback.classList.add("text-red-500");
      return;
    }

    try {
      const saved = await addressService.add(user.id, address);
      sessionStorage.setItem("checkout-address-id", saved.id);
      navigate("/checkout/payment");
    } catch (err) {
      feedback.textContent = err.message;
      feedback.classList.remove("hidden");
      feedback.classList.add("text-red-500");
    }
  });
}
