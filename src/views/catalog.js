import { productService } from "../services/product.js";
import "../components/product-card.js";

export function renderCatalog(container, params) {
  const searchTerm = params.query.get("name") || "";

  container.innerHTML = `
    <section class="flex flex-col gap-10 max-w-5xl mx-auto px-6 py-10 pt-27">
      <h1 class="text-center text-lg font-bold text-primary">
        ${searchTerm ? `Resultados para "${searchTerm}"` : "Catálogo completo"}
      </h1>

      <div id="product-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-5 gap-y-10">
        ${Array.from({ length: 8 })
          .map(() => `<product-card data-loading="true"></product-card>`)
          .join("")}
      </div>

      ${searchTerm ? `<nav class="text-center" ><a href="/catalog" class="text-primary font-bold pointer underline" >Ver catálogo completo</a></nav>` : ""}
    </section>
  `;

  loadProducts(container, searchTerm);
}

async function loadProducts(container, searchTerm) {
  const grid = container.querySelector("#product-grid");

  try {
    const products = searchTerm
      ? await productService.search(searchTerm)
      : await productService.getAll();

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
  } catch (err) {
    console.error(err);
  }
}
