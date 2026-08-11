import { productService } from "../services/product.js";
import "../components/product-card.js";

const GROUP_MEMBER_IMAGES = ["arakaki", "boregio", "edward", "lorraine"];

const SORT_OPTIONS = [
  { value: "default", label: "Padrão" },
  { value: "priceDesc", label: "Maior preço" },
  { value: "priceAsc", label: "Menor preço" },
  { value: "newest", label: "Mais novos" },
  { value: "group", label: "Integrantes do grupo" },
];

export function renderCatalog(container, params) {
  const searchTerm = params.query.get("name") || "";

  container.innerHTML = `
    <section class="flex flex-col gap-10 max-w-5xl mx-auto px-6 py-10">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <h1 class="text-lg font-bold text-primary">
          ${searchTerm ? `Resultados para "${searchTerm}"` : "Catálogo completo"}
        </h1>
        ${filterDropdown()}
      </div>

      <div id="product-grid" class="stagger-in grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-5 gap-y-10">
        ${Array.from({ length: 8 })
          .map(() => `<product-card data-loading="true"></product-card>`)
          .join("")}
      </div>

      ${searchTerm ? `<nav class="text-center" ><a href="/catalog" class="text-primary font-bold pointer underline" >Ver catálogo completo</a></nav>` : ""}
    </section>
  `;

  loadProducts(container, searchTerm);
}

function filterDropdown() {
  return `
    <div id="catalog-filter" class="relative inline-block text-sm" data-value="default" data-open="false">
      <button type="button"
              id="catalog-filter-trigger"
              aria-haspopup="listbox"
              aria-expanded="false"
              class="flex items-center gap-2 border border-secondary/60 bg-surface text-text rounded-full pl-4 pr-3 py-2 hover:border-primary hover:text-primary transition-colors cursor-pointer shadow-sm">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"></path>
        </svg>
        <span id="catalog-filter-label" class="font-medium">Ordenar por</span>
        <svg id="catalog-filter-chevron" class="w-4 h-4 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <ul id="catalog-filter-menu"
          role="listbox"
          class="hidden absolute right-0 mt-2 min-w-[220px] bg-surface border border-secondary/40 rounded-2xl shadow-lg overflow-hidden z-20">
        ${SORT_OPTIONS.map(
          (opt) => `
          <li role="option"
              data-value="${opt.value}"
              class="px-4 py-2.5 cursor-pointer flex items-center justify-between gap-3 text-text hover:bg-primary/10 hover:text-primary transition-colors"
              aria-selected="${opt.value === "default"}">
            <span>${opt.label}</span>
            <svg class="check hc-fade w-4 h-4 text-primary opacity-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </li>
        `,
        ).join("")}
      </ul>
    </div>
  `;
}

async function loadProducts(container, searchTerm) {
  const grid = container.querySelector("#product-grid");

  try {
    const products = searchTerm
      ? await productService.search(searchTerm)
      : await productService.getAll();

    setupFilter(container, {
      onChange: (mode) => renderGrid(grid, applyFilter(products, mode), searchTerm),
    });

    renderGrid(grid, products, searchTerm);
  } catch (err) {
    console.error(err);
  }
}

function setupFilter(container, { onChange }) {
  const root = container.querySelector("#catalog-filter");
  const trigger = root.querySelector("#catalog-filter-trigger");
  const menu = root.querySelector("#catalog-filter-menu");
  const chevron = root.querySelector("#catalog-filter-chevron");
  const label = root.querySelector("#catalog-filter-label");

  const close = () => {
    if (root.dataset.open === "false") return;
    root.dataset.open = "false";
    menu.classList.add("hidden");
    trigger.setAttribute("aria-expanded", "false");
    chevron.classList.remove("rotate-180");
  };

  const open = () => {
    root.dataset.open = "true";
    menu.classList.remove("hidden");
    // re-dispara a animação de abertura mesmo em aberturas subsequentes
    menu.classList.remove("menu-enter");
    void menu.offsetWidth;
    menu.classList.add("menu-enter");
    trigger.setAttribute("aria-expanded", "true");
    chevron.classList.add("rotate-180");
  };

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    root.dataset.open === "true" ? close() : open();
  });

  menu.querySelectorAll("li[role='option']").forEach((li) => {
    li.addEventListener("click", () => {
      const value = li.dataset.value;
      root.dataset.value = value;
      label.textContent = value === "default" ? "Ordenar por" : li.querySelector("span").textContent;

      menu.querySelectorAll("li[role='option']").forEach((other) => {
        const isSelected = other === li;
        other.setAttribute("aria-selected", String(isSelected));
        other.querySelector(".check").classList.toggle("opacity-0", !isSelected);
      });

      close();
      onChange(value);
    });
  });

  // fecha ao clicar fora ou pressionar Esc — padrão de dropdown acessível
  document.addEventListener("click", (e) => {
    if (!root.contains(e.target)) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}

// Sem createdAt na API: "mais novos" usa id desc como proxy (auto-increment).
// "Integrantes do grupo" filtra por imageUrl, mais estável que nome (Lorraine = "Lolo").
function applyFilter(products, mode) {
  switch (mode) {
    case "priceDesc":
      return [...products].sort((a, b) => b.price - a.price);
    case "priceAsc":
      return [...products].sort((a, b) => a.price - b.price);
    case "newest":
      return [...products].sort((a, b) => b.id - a.id);
    case "group":
      return products.filter((p) => GROUP_MEMBER_IMAGES.includes(p.imageUrl));
    default:
      return products;
  }
}

function renderGrid(grid, products, searchTerm) {
  if (products.length === 0) {
    grid.innerHTML = `
      <p class="col-span-full text-center text-text/60">
        Nenhum produto encontrado${searchTerm ? ` para "${searchTerm}"` : ""}.
      </p>
    `;
    return;
  }

  grid.innerHTML = products
    .map(
      (p) => `
      <product-card
        data-id="${p.id}"
        data-name="${p.name}"
        data-price="${p.price}"
        data-image="${p.imageUrl}">
      </product-card>
    `,
    )
    .join("");

  // re-dispara o stagger a cada troca de filtro. Reflow forçado entre remove/add
  // é o único padrão que sempre reinicia animações CSS de forma síncrona.
  grid.classList.remove("stagger-in");
  void grid.offsetWidth;
  grid.classList.add("stagger-in");
}
