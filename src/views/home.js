import { productService } from "../services/product.js";
import { imageSrc } from "../utils/image.js";
import { splitPinned } from "../utils/products.js";
import { escapeHtml } from "../utils/html.js";
import "../components/product-carousel.js";
import "../components/hero-carousel.js";

const RARITY_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "COMUM", label: "Comum" },
  { value: "AURUDO", label: "Aurudo" },
  { value: "GOD", label: "God" },
];

export async function renderHome(container) {
  container.innerHTML = `
    <hero-carousel></hero-carousel>
    <section class="flex flex-col gap-6 px-6 sm:px-10 py-8 max-w-6xl mx-auto">
      <h2 class="text-xl font-semibold text-primary text-center">Destaques</h2>

      <div id="rarity-filters" class="flex flex-wrap justify-center gap-3">
        ${RARITY_FILTERS.map((f) => filterPill(f, f.value === "all")).join("")}
      </div>

      <product-carousel id="featured-carousel"></product-carousel>

      <div id="featured-large" class="flex flex-wrap justify-center gap-6"></div>

      <nav class="text-center"><a href="/catalog" class="text-primary font-bold pointer underline">Ver catálogo completo</a></nav>
    </section>
  `;

  const carousel = container.querySelector("#featured-carousel");
  const largeGrid = container.querySelector("#featured-large");
  const filtersEl = container.querySelector("#rarity-filters");

  carousel.setLoading(4);

  let allProducts = [];
  let pinnedProducts = [];
  let activeFilter = "all";

  try {
    allProducts = await productService.getAll();
    pinnedProducts = splitPinned(allProducts).pinned;
    renderFiltered();
  } catch (err) {
    console.error(err);
  }

  function renderFiltered() {
    // filtro "God" mostra só Rodolfo/Diogo, que já ficam fixos nos quadrados grandes —
    // o carrossel viraria uma repetição exata, então some por completo nesse caso
    if (activeFilter === "GOD") {
      carousel.classList.add("hidden");
      renderLarge(pinnedProducts);
      return;
    }
    carousel.classList.remove("hidden");

    // carrossel segue o filtro normalmente, sem pin — Rodolfo/Diogo só aparecem
    // ali quando o filtro naturalmente os inclui (Todos)
    const filtered =
      activeFilter === "all"
        ? allProducts
        : allProducts.filter((p) => p.rarity === activeFilter);

    if (filtered.length === 0) {
      carousel.setProducts([]);
    } else {
      carousel.setProducts(filtered);
    }

    // os quadrados grandes de destaque são sempre o Rodolfo e o Diogo (fixados),
    // independente do filtro de raridade ativo
    if (pinnedProducts.length > 0) {
      renderLarge(pinnedProducts);
    } else if (filtered.length > 0) {
      renderLarge(filtered.slice(0, 2));
    } else {
      largeGrid.innerHTML = `
        <p class="col-span-full text-center text-text/70 py-10">
          Nenhum produto encontrado para essa raridade.
        </p>
      `;
    }
  }

  function renderLarge(products) {
    largeGrid.innerHTML = products
      .map(
        (p) => `
        <a href="/product/${p.id}" data-link class="flex flex-col group w-64 sm:w-80">
          <div class="aspect-square bg-surface rounded-3xl overflow-hidden">
            <img src="${imageSrc(p.imageUrl)}" alt="${escapeHtml(p.imageAltText || p.name)}"
                 class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          </div>
          <p class="text-base font-semibold text-text mt-4 text-center">${escapeHtml(p.name)}</p>
          <p class="text-base text-primary font-medium text-center">R$ ${Number(p.price).toFixed(2)}</p>
        </a>
      `,
      )
      .join("");
  }

  filtersEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn || btn.dataset.filter === activeFilter) return;

    activeFilter = btn.dataset.filter;
    filtersEl.querySelectorAll("[data-filter]").forEach((b) => {
      const isActive = b === btn;
      b.classList.toggle("bg-primary", isActive);
      b.classList.toggle("text-white", isActive);
      b.classList.toggle("bg-primary/10", !isActive);
      b.classList.toggle("text-primary", !isActive);
    });

    carousel.setLoading(4);
    renderFiltered();
  });
}

function filterPill(filter, active) {
  return `
    <button type="button" data-filter="${filter.value}"
            class="px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              active ? "bg-primary text-white" : "bg-primary/10 text-primary hover:bg-primary/20"
            }">
      ${filter.label}
    </button>
  `;
}
