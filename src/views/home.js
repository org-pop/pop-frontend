import { productService } from "../services/product.js";
import { imageSrc } from "../utils/image.js";
import "../components/product-carousel.js";

const RARITY_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "COMUM", label: "Comum" },
  { value: "RARO", label: "Raro" },
  { value: "AURUDO", label: "Aurudo" },
];

export async function renderHome(container) {
  container.innerHTML = `
    <section class="h-[400px] bg-[url('/home.png')] bg-cover bg-center bg-no-repeat"></section>
    <section class="flex flex-col gap-6 px-6 sm:px-10 py-8 max-w-6xl mx-auto">
      <h2 class="text-xl font-semibold text-primary text-center">Destaques</h2>

      <div id="rarity-filters" class="flex flex-wrap justify-center gap-3">
        ${RARITY_FILTERS.map((f) => filterPill(f, f.value === "all")).join("")}
      </div>

      <product-carousel id="featured-carousel"></product-carousel>

      <div id="featured-large" class="grid grid-cols-1 sm:grid-cols-2 gap-4"></div>

      <nav class="text-center"><a href="/catalog" class="text-primary font-bold pointer underline">Ver catálogo completo</a></nav>
    </section>
  `;

  const carousel = container.querySelector("#featured-carousel");
  const largeGrid = container.querySelector("#featured-large");
  const filtersEl = container.querySelector("#rarity-filters");

  carousel.setLoading(4);

  let allProducts = [];
  let activeFilter = "all";

  try {
    allProducts = await productService.getAll();
    renderFiltered();
  } catch (err) {
    console.error(err);
  }

  function renderFiltered() {
    const filtered =
      activeFilter === "all"
        ? allProducts
        : allProducts.filter((p) => p.rarity === activeFilter);

    if (filtered.length === 0) {
      carousel.setProducts([]);
      largeGrid.innerHTML = `
        <p class="col-span-full text-center text-text/50 py-10">
          Nenhum produto encontrado para essa raridade.
        </p>
      `;
      return;
    }

    carousel.setProducts(filtered.slice(0, 4));

    // pega os próximos 2 pra não repetir o que já apareceu nos cards pequenos;
    // se não sobrar o suficiente, volta pro começo da lista filtrada
    const rest = filtered.slice(4, 6);
    renderLarge(rest.length > 0 ? rest : filtered.slice(0, 2));
  }

  function renderLarge(products) {
    largeGrid.innerHTML = products
      .map(
        (p) => `
        <a href="/product/${p.id}" data-link class="flex flex-col group">
          <div class="aspect-square bg-surface rounded-3xl overflow-hidden">
            <img src="${imageSrc(p.imageUrl)}" alt="${p.imageAltText || p.name}"
                 class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          </div>
          <p class="text-base font-semibold text-text mt-4 text-center">${p.name}</p>
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
