import { productService } from "../services/product.js";
import "../components/product-card.js";

const FILTERS = [
  { label: "Todos", value: null },
  { label: "Novo", rarity: "COMUM" },
  { label: "Raro", rarity: "RARO" },
  { label: "Ultra", rarity: "ULTRA_RARO" },
];

export function renderCatalog(container) {
  let activeFilter = FILTERS[0];

  function render() {
    container.innerHTML = `
      <section class="max-w-5xl mx-auto px-6 py-10">
        <h1 class="text-center text-lg font-bold text-primary mb-6">Catálogo completo</h1>

        <div class="flex flex-wrap justify-center gap-3 mb-8">
          ${FILTERS.map(
            (f) => `
            <button data-filter="${f.label}"
                    class="px-5 py-1.5 text-sm font-medium transition-colors text-white ${f.label === activeFilter.label ? "bg-primary" : "bg-secondary hover:bg-secondary/80"}">
              ${f.label}
            </button>
          `
          ).join("")}
        </div>

        <div id="product-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-8">
          ${Array.from({ length: 8 })
            .map(() => `<product-card data-loading="true"></product-card>`)
            .join("")}
        </div>
      </section>
    `;

    container.querySelectorAll("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeFilter = FILTERS.find((f) => f.label === btn.dataset.filter);
        render();
        loadProducts();
      });
    });
  }

  async function loadProducts() {
    const grid = container.querySelector("#product-grid");

    try {
      const products = activeFilter.rarity
        ? await productService.getByyRarity(activeFilter.rarity)
        : await productService.getAll();

      grid.innerHTML = products
        .map(
          (p) => `
          <product-card
            data-id="${p.id}"
            data-name="${p.name}"
            data-price="${p.price}"
            data-image="${p.imageUrl}">
          </product-card>
        `
        )
        .join("");
    } catch (err) {
      console.log(err)
    }
  }

  render();
  loadProducts();
}
