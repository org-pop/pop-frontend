import { productService } from "../services/product.js";
import "../components/product-carousel.js";

export async function renderHome(container) {
  container.innerHTML = `
    <section class="h-[400px] bg-[url('/home.png')] bg-cover bg-center bg-no-repeat"></section>
    <section class="flex flex-col gap-6 px-6 sm:px-10 py-8 mx-6 sm:mx-[10vw]">
      <h2 class="text-xl font-semibold text-primary text-center">Destaques</h2>
      <product-carousel id="featured-carousel"></product-carousel>
      <nav class="text-center" ><a href="/catalog" class="text-primary font-bold pointer underline" >Ver catálogo completo</a></nav>
    </section>
  `;

  const carousel = container.querySelector("#featured-carousel");
  carousel.setLoading(4); // shows 4 shimmering skeletons immediately

  try {
    const products = await productService.getAll();
    carousel.setProducts(products);
  } catch (err) {
    console.error(err);
  }
}
