import { store } from "../state/store.js";
import { navigate } from "../router.js";
import { orderService } from "../services/order.js";

const STATUS_LABELS = {
  PENDING: "Pendente",
  PROCESSING: "Em processamento",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

export async function renderProfile(container) {
  const { user } = store.getState();

  container.innerHTML = shell(user, `<p class="text-center text-text/50 py-10">Carregando pedidos...</p>`);
  wireHeader(container);

  try {
    const orders = await orderService.getByUser(user.id);

    container.querySelector("#orders-list").innerHTML = orders.length
      ? orders
          .slice()
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .map(orderRow)
          .join("")
      : `<p class="text-center text-text/50 py-10 px-4">Você ainda não fez nenhum pedido.</p>`;
  } catch (err) {
    console.error(err);
    container.querySelector("#orders-list").innerHTML =
      `<p class="text-center text-red-500 py-10 px-4">Não foi possível carregar seus pedidos.</p>`;
  }
}

function shell(user, ordersContent) {
  return `
    <section class="max-w-5xl mx-auto px-6 py-10 min-h-screen">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

        <div class="flex flex-col">
          <header class="flex items-center gap-4 mb-6">
            <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold shrink-0">
              ${initials(user.name)}
            </div>
            <div class="min-w-0">
              <h1 class="text-xl font-bold text-text truncate">${user.name || "Minha conta"}</h1>
              <p class="text-sm text-text/60 truncate">${user.email || ""}</p>
            </div>
          </header>

          <button id="edit-data-btn" type="button"
                  class="w-full bg-primary hover:bg-accent text-white py-3 rounded-full transition-colors mb-6">
            Editar dados
          </button>

          <div class="border border-secondary/40 rounded-2xl bg-surface overflow-hidden">
            <div class="flex items-center gap-3 px-6 py-5 border-b border-secondary/20">
              <svg class="w-5 h-5 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              <div>
                <p class="font-semibold text-primary text-sm">Meus pedidos</p>
                <p class="text-xs text-text/50">Acompanhe seus pedidos aqui</p>
              </div>
            </div>

            <div id="orders-list" class="divide-y divide-secondary/10">
              ${ordersContent}
            </div>
          </div>

          <button id="logout-btn" type="button"
                  class="w-full border border-secondary/60 text-text hover:bg-secondary/10 py-3 rounded-full transition-colors mt-6">
            Sair da conta
          </button>
        </div>

        <img src="/home.png" alt="" aria-hidden="true"
             class="hidden md:block w-full h-full object-cover rounded-2xl max-h-[600px]" />

      </div>
    </section>
  `;
}

function orderRow(order) {
  const date = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("pt-BR")
    : "";
  return `
    <div class="px-6 py-4">
      <p class="text-sm font-semibold text-text">Pedido #${order.id}</p>
      <p class="text-xs text-text/50">${STATUS_LABELS[order.status] || order.status}${date ? ` · ${date}` : ""}</p>
    </div>
  `;
}

function wireHeader(container) {
  container.querySelector("#edit-data-btn").addEventListener("click", () => navigate("/profile/edit"));

  container.querySelector("#logout-btn").addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    store.setState({ user: null, cart: [] });
    navigate("/");
  });
}

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
