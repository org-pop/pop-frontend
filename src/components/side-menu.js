import { store, isAdmin } from "../state/store.js";
import { navigate } from "../router.js";

const LINKS = [
  { href: "/", label: "Início", icon: "home" },
  { href: "/catalog", label: "Catálogo", icon: "grid" },
  { href: "/cart", label: "Carrinho", icon: "cart" },
];

const ICONS = {
  home: `<path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" />`,
  grid: `<rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />`,
  cart: `<circle cx="9" cy="20" r="1.5" /><circle cx="17" cy="20" r="1.5" /><path d="M2 3h2l2.4 12.4a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L21 7H6" />`,
  user: `<circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />`,
  login: `<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" />`,
  logout: `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />`,
  admin: `<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />`,
};

class SideMenu extends HTMLElement {
  connectedCallback() {
    this.isOpen = false;
    // monta o esqueleto (overlay + painel) uma única vez — abrir/fechar só alterna
    // classes nesses mesmos nós depois, senão recriar o innerHTML a cada toggle
    // mata a transição CSS (não há "estado anterior" pra animar a partir de um nó novo)
    this.renderShell();
    this.wireShellEvents();

    this.onToggle = () => this.setOpen(!this.isOpen);
    this.onKeydown = (e) => {
      if (e.key === "Escape" && this.isOpen) this.setOpen(false);
    };
    window.addEventListener("side-menu-toggle", this.onToggle);
    window.addEventListener("keydown", this.onKeydown);

    // fecha o menu automaticamente quando a rota muda (back/forward do navegador)
    this.onRouteChange = () => this.setOpen(false);
    window.addEventListener("popstate", this.onRouteChange);
  }

  disconnectedCallback() {
    window.removeEventListener("side-menu-toggle", this.onToggle);
    window.removeEventListener("keydown", this.onKeydown);
    window.removeEventListener("popstate", this.onRouteChange);
  }

  renderShell() {
    this.innerHTML = `
      <div id="side-menu-root" class="fixed inset-0 z-50 pointer-events-none" aria-hidden="true" inert>
        <div id="side-menu-overlay"
             class="hc-fade absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 ease-out">
        </div>

        <nav id="side-menu-panel" aria-label="Menu de navegação"
             class="absolute inset-y-0 left-0 w-72 max-w-[80vw] bg-surface shadow-xl flex flex-col
                    -translate-x-full transition-transform duration-300 ease-out">
          <div class="flex items-center justify-between px-5 py-4 border-b border-secondary/20">
            <span class="text-lg font-black text-primary">POP.</span>
            <button type="button" id="side-menu-close" aria-label="Fechar menu"
                    class="text-text/70 hover:text-primary transition-colors p-1">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <ul id="side-menu-links" class="flex flex-col gap-1 p-3 overflow-y-auto"></ul>

          <div id="side-menu-footer" class="mt-auto"></div>
        </nav>
      </div>
    `;
  }

  wireShellEvents() {
    this.querySelector("#side-menu-overlay").addEventListener("click", () => this.setOpen(false));
    this.querySelector("#side-menu-close").addEventListener("click", () => this.setOpen(false));
  }

  setOpen(open) {
    this.isOpen = open;

    // atualiza o conteúdo dinâmico (rota ativa, login) só ao abrir — o innerHTML
    // dessa parte interna pode ser recriado à vontade, não afeta a animação do painel
    if (open) this.renderLinks();

    const root = this.querySelector("#side-menu-root");
    const overlay = this.querySelector("#side-menu-overlay");
    const panel = this.querySelector("#side-menu-panel");

    root.classList.toggle("pointer-events-none", !open);
    root.setAttribute("aria-hidden", String(!open));
    // sem isso, o menu fechado ainda tem botões/links focáveis por Tab mesmo
    // com aria-hidden — inert remove foco e interação de verdade, não só visual
    root.toggleAttribute("inert", !open);

    overlay.classList.toggle("opacity-0", !open);
    overlay.classList.toggle("opacity-100", open);

    panel.classList.toggle("-translate-x-full", !open);
    panel.classList.toggle("translate-x-0", open);

    document.body.classList.toggle("overflow-hidden", open); // trava o scroll da página com o drawer aberto
  }

  renderLinks() {
    const { user } = store.getState();
    const currentPath = window.location.pathname;

    const authLink = user
      ? { href: "/profile", label: "Minha conta", icon: "user" }
      : { href: "/login", label: "Entrar", icon: "login" };

    const links = [...LINKS];
    if (isAdmin(user)) links.push({ href: "/admin/products", label: "Administração", icon: "admin" });
    links.push(authLink);

    this.querySelector("#side-menu-links").innerHTML = links
      .map((link) => linkItem(link, currentPath))
      .join("");

    this.querySelector("#side-menu-footer").innerHTML = user
      ? `
        <div class="p-3 border-t border-secondary/20">
          <button type="button" id="side-menu-logout"
                  class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-text/70 hover:bg-secondary/10 hover:text-red-500 transition-colors">
            <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.logout}</svg>
            <span class="text-sm font-medium">Sair da conta</span>
          </button>
        </div>
      `
      : "";

    // navigate() usa pushState direto (não dispara "popstate"), então precisa fechar
    // o drawer aqui mesmo quando o clique é num link interno do menu
    this.querySelectorAll("#side-menu-links a[data-link]").forEach((link) =>
      link.addEventListener("click", () => this.setOpen(false)),
    );

    this.querySelector("#side-menu-logout")?.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      store.setState({ user: null, cart: [] });
      this.setOpen(false);
      navigate("/");
    });
  }
}

function linkItem(link, currentPath) {
  const isActive = link.href === "/" ? currentPath === "/" : currentPath.startsWith(link.href);
  return `
    <li>
      <a href="${link.href}" data-link aria-current="${isActive ? "page" : "false"}"
         class="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
                ${isActive ? "bg-primary/10 text-primary font-semibold" : "text-text/70 hover:bg-secondary/10 hover:text-primary"}">
        <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[link.icon]}</svg>
        <span class="text-sm">${link.label}</span>
      </a>
    </li>
  `;
}

customElements.define("side-menu", SideMenu);
