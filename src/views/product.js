import { productService } from "../services/product.js";
import { cartService } from "../services/cart.js";
import { store } from "../state/store.js";
import { navigate } from "../router.js";
import { showToast } from "../components/toast.js";
import { imageSrc } from "../utils/image.js";
import "../components/product-carousel.js";

export async function renderProduct(container, params) {
  container.innerHTML = `<p class="min-h-screen flex flex-col justify-center text-center text-text/60 py-20">Carregando produto...</p>`;

  try {
    const product = await productService.getById(params.id);
    render(container, product);
    loadRelated(container, product);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="min-h-screen flex flex-col justify-center text-center text-red-500 py-20">Não foi possível carregar o produto. Confira se o servidor está rodando e tente novamente.</p>`;
  }
}

function render(container, product) {
  const inStock = product.stock > 0;

  container.innerHTML = `
    <section class="max-w-5xl mx-auto px-6 py-10 min-h-screen">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div class="aspect-square bg-surface rounded-3xl overflow-hidden">
          <img src="${imageSrc(product.imageUrl)}" alt="${product.imageAltText || product.name}" class="w-full h-full object-cover" />
        </div>

        <div class="flex flex-col">
          <p class="text-xs uppercase tracking-wide text-secondary font-medium">${product.franchise}</p>
          <h1 class="text-2xl font-bold text-text mt-1">${product.name}</h1>

          <span class="inline-block w-fit mt-3 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
            ${product.rarity}
          </span>

          <p id="price-display" class="text-2xl font-bold text-primary mt-6">R$ ${Number(product.price).toFixed(2)}</p>

          <p class="text-sm text-text/70 mt-4 leading-relaxed">${product.description || "Sem descrição disponível."}</p>

          <p id="stock-info" class="text-sm mt-6 ${inStock ? "text-text/60" : "text-red-500 font-medium"}">
            ${inStock ? `${product.stock - 1} unidades em estoque` : "Fora de estoque"}
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
  const stockInfo = container.querySelector("#stock-info");
  const priceDisplay = container.querySelector("#price-display");

  const sync = () => {
    qtyValue.textContent = qty;
    if (stockInfo) stockInfo.textContent = `${product.stock - qty} unidades em estoque`;
    if (priceDisplay) priceDisplay.textContent = `R$ ${(product.price * qty).toFixed(2)}`;
  };

  container.querySelector("#qty-minus").addEventListener("click", () => {
    if (qty > 1) qty--;
    sync();
  });

  container.querySelector("#qty-plus").addEventListener("click", () => {
    if (qty < product.stock) qty++;
    sync();
  });

  container
    .querySelector("#add-to-cart-btn")
    .addEventListener("click", async () => {
      const { user, cart } = store.getState();
      if (!user) {
        navigate(`/login?redirect=/product/${product.id}`);
        return;
      }

      const previousCart = cart;
      // atualização otimista — mostra o resultado na hora, sem esperar a rede
      store.setState({ cart: [...cart, { quantity: qty }] });
      showToast("Adicionado ao carrinho!");

      try {
        // addItem no pop-api ainda devolve só o CartItem criado (não a lista
        // inteira), então precisamos buscar o carrinho atualizado à parte —
        // senão o store.cart vira um objeto único e quebra o cart.reduce do header
        await cartService.addItem(user.id, product.id, qty);
        const updatedCart = await cartService.get(user.id);
        store.setState({ cart: updatedCart });
      } catch (err) {
        store.setState({ cart: previousCart }); // desfaz a atualização otimista
        showToast(err.message, "error");
      }
    });
}

async function loadRelated(container, product) {
  const carousel = container.querySelector("#related-carousel");
  if (!carousel) return;

  carousel.setLoading(4);

  try {
    const related = await productService.getByFranchise(product.franchise);
    const filtered = related.filter((p) => p.id !== product.id);
    carousel.setProducts(filtered);
  } catch (err) {
    carousel.outerHTML = "";
  }
}
