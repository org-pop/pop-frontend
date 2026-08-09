import { store } from "../state/store.js";
import { navigate } from "../router.js";

export function renderProfile(container) {
  const { user } = store.getState();

  container.innerHTML = `
    <section class="max-w-xl mx-auto px-6 py-10 pt-28 min-h-screen">
      <h1 class="text-2xl font-bold text-text">Minha conta</h1>

      <dl class="mt-8 border border-secondary/40 rounded-2xl divide-y divide-secondary/20 bg-surface">
        <div class="flex justify-between items-center px-6 py-4">
          <dt class="text-sm text-muted">Nome</dt>
          <dd class="text-sm font-medium text-text">${user.name || "—"}</dd>
        </div>
        <div class="flex justify-between items-center px-6 py-4">
          <dt class="text-sm text-muted">E-mail</dt>
          <dd class="text-sm font-medium text-text">${user.email || "—"}</dd>
        </div>
      </dl>

      <nav aria-label="Atalhos da conta" class="flex flex-col sm:flex-row gap-3 mt-6">
        <a href="/cart" data-link
           class="flex-1 text-center border border-primary text-primary hover:bg-primary/5 py-3 rounded-full transition-colors">
          Meu carrinho
        </a>
        <button type="button" id="logout-btn"
                class="flex-1 bg-primary hover:bg-accent text-white py-3 rounded-full transition-colors">
          Sair da conta
        </button>
      </nav>
    </section>
  `;

  container.querySelector("#logout-btn").addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    store.setState({ user: null, cart: [] });
    navigate("/");
  });
}
