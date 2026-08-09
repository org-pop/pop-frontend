class ProductCard extends HTMLElement {
  static get observedAttributes() {
    return ["data-id", "data-name", "data-price", "data-image", "data-loading"];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  render() {
    const isLoading = this.getAttribute("data-loading") === "true";
    const id = this.getAttribute("data-id");
    const name = this.getAttribute("data-name") || "";
    const price = this.getAttribute("data-price");
    const image = this.getAttribute("data-image");

    if (isLoading) {
      this.innerHTML = `
        <div class="flex flex-col">
          <div class="skeleton-shimmer aspect-square rounded-md"></div>
          <div class="skeleton-shimmer h-3 w-3/4 rounded mt-3"></div>
          <div class="skeleton-shimmer h-3 w-1/3 rounded mt-2"></div>
        </div>
      `;
      return;
    }

    this.innerHTML = `
      <a href="/product/${id}" data-link class="flex flex-col group cursor-pointer">
        <div class="aspect-square bg-surface overflow-hidden rounded-3xl">
          <img src="../public/images/${image}.png" alt="${name}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        </div>
        <p class="text-sm text-text mt-3 text-center">${name}</p>
        <p class="text-sm text-text/70 text-center">R$ ${Number(price).toFixed(2)}</p>
      </a>
    `;
  }
}

customElements.define("product-card", ProductCard);
