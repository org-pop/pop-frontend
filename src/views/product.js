import { productService } from "../services/product.js";
import { cartService } from "../services/cart.js";
import { store } from "../state/store.js";
import { navigate } from "../router.js";
import "../components/product-carousel.js";

export async function renderProduct(container, params) {
  container.innerHTML = `<p class="min-h-screen flex flex-col justify-center text-center text-text/60 py-20">Carregando produto...</p>`;

  try {
    const product = await productService.getById(params.id);
    render(container, product);
    loadRelated(container, product);
  } catch (err) {
    console.error(err);
  }
}

function render(container, product) {
  const inStock = product.stock > 0;

  container.innerHTML = `
    <section class="max-w-5xl mx-auto px-6 py-10 min-h-screen">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div class="aspect-square bg-surface rounded-lg overflow-hidden">
          <img src="../${product.imageUrl}" alt="${product.imageAltText || product.name}" class="w-full h-full object-cover" />
        </div>

        <div class="flex flex-col">
          <p class="text-xs uppercase tracking-wide text-secondary font-medium">${product.franchise}</p>
          <h1 class="text-2xl font-bold text-text mt-1">${product.name}</h1>

          <span class="inline-block w-fit mt-3 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
            ${product.rarity}
          </span>

          <p class="text-2xl font-bold text-primary mt-6">R$ ${Number(product.price).toFixed(2)}</p>

          <p class="text-sm text-text/70 mt-4 leading-relaxed">${product.description}</p>

          <p class="text-sm mt-6 ${inStock ? "text-text/60" : "text-red-500 font-medium"}">
            ${inStock ? `${product.stock} unidades em estoque` : "Fora de estoque"}
          </p>

          <div class="flex items-center gap-3 mt-4">
            <button id="qty-minus" type="button"
                    class="w-9 h-9 rounded-full border border-secondary text-primary hover:bg-secondary/10 transition-colors">−</button>
            <span id="qty-value" class="w-8 text-center text-text">1</span>
            <button id="qty-plus" type="button"
                    class="w-9 h-9 rounded-full border border-secondary text-primary hover:bg-secondary/10 transition-colors">+</button>
          </div>

          <button id="add-to-cart-btn" type="button" ${!inStock ? "disabled" : ""}
                  class="w-full bg-primary hover:bg-accent disabled:bg-secondary/30 disabled:cursor-not-allowed text-white py-3.5 rounded-full mt-6 transition-colors">
            ${inStock ? "Adicionar ao carrinho" : "Indisponível"}
          </button>

          <p id="cart-feedback" class="text-sm text-primary mt-3 hidden"></p>
        </div>
      </div>

      <div class="mt-16">
        <h2 class="text-lg font-semibold text-text mb-4">Você também pode gostar</h2>
        <product-carousel id="related-carousel"></product-carousel>
      </div>
    </section>
  `;

  setupInteractions(container, product);
}

function setupInteractions(container, product) {
  let qty = 1;
  const qtyValue = container.querySelector("#qty-value");
  const feedback = container.querySelector("#cart-feedback");

  container.querySelector("#qty-minus").addEventListener("click", () => {
    if (qty > 1) qty--;
    qtyValue.textContent = qty;
  });

  container.querySelector("#qty-plus").addEventListener("click", () => {
    if (qty < product.stock) qty++;
    qtyValue.textContent = qty;
  });

  container
    .querySelector("#add-to-cart-btn")
    .addEventListener("click", async () => {
      const { user } = store.getState();
      if (!user) {
        navigate(`/login?redirect=/products/${product.id}`);
        return;
      }

      try {
        const updatedCart = await cartService.addItem(user.id, product.id, qty);
        store.setState({ cart: updatedCart });
        feedback.textContent = "Adicionado ao carrinho!";
        feedback.classList.remove("hidden");
      } catch (err) {
        feedback.textContent = err.message;
        feedback.classList.remove("hidden");
        feedback.classList.add("text-red-500");
      }
    });
}

async function loadRelated(container, product) {
  const carousel = container.querySelector("#related-carousel");
  if (!carousel) return;

  carousel.setLoading(4);

  try {
    const related = await productService.byFranchise(product.franchise);
    const filtered = related.filter((p) => p.id !== product.id);
    carousel.setProducts(filtered);
  } catch (err) {
    carousel.outerHTML = "";
  }
}
