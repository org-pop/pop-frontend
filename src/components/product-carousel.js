import "./product-card.js";

class ProductCarousel extends HTMLElement {
  connectedCallback() {
    this.products = [];
    this.render();
  }

  setProducts(products) {
    this.products = products;
    this.render();
  }

  setLoading(count = 4) {
    this.products = Array.from({ length: count }, () => null);
    this.render();
  }

  render() {
    const cardsHtml = this.products
      .map((p) =>
        p
          ? `<product-card
              class="shrink-0 w-40 sm:w-48 md:w-56"
              data-id="${p.id}"
              data-name="${p.name}"
              data-price="${p.price}"
              data-image="${p.imageUrl}">
            </product-card>`
          : `<product-card class="shrink-0 w-40 sm:w-48 md:w-56" data-loading="true"></product-card>`
      )
      .join("");

    this.innerHTML = `
      <div class="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 sm:justify-between gap-4">
        ${cardsHtml}
      </div>
    `;

    this.querySelectorAll("product-card").forEach((card) => {
      card.classList.add("snap-start");
    });
  }
}

customElements.define("product-carousel", ProductCarousel);
