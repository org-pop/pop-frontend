import "./product-card.js";
import { escapeHtml } from "../utils/html.js";

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
              data-name="${escapeHtml(p.name)}"
              data-price="${p.price}"
              data-image="${escapeHtml(p.imageUrl)}">
            </product-card>`
          : `<product-card class="shrink-0 w-40 sm:w-48 md:w-56" data-loading="true"></product-card>`,
      )
      .join("");

    this.innerHTML = `
      <div class="relative group/carousel">
        <button type="button" data-nav="prev" aria-label="Anterior"
                class="hidden md:flex opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100 disabled:hidden
                       absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-9 h-9 items-center justify-center
                       rounded-full bg-surface text-primary shadow-md hover:bg-primary hover:text-white transition-all duration-200">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>

        <div id="track" class="flex overflow-x-auto scrollbar-hide pb-2 sm:justify-between gap-4 cursor-grab active:cursor-grabbing">
          ${cardsHtml}
        </div>

        <button type="button" data-nav="next" aria-label="Próximo"
                class="hidden md:flex opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100 disabled:hidden
                       absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-9 h-9 items-center justify-center
                       rounded-full bg-surface text-primary shadow-md hover:bg-primary hover:text-white transition-all duration-200">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
    `;

    this.setupInteractions();
  }

  setupInteractions() {
    const track = this.querySelector("#track");
    const prevBtn = this.querySelector('[data-nav="prev"]');
    const nextBtn = this.querySelector('[data-nav="next"]');
    if (!track) return;

    const scrollByCard = (dir) => {
      const card = track.firstElementChild;
      const step = card ? card.getBoundingClientRect().width + 16 : track.clientWidth * 0.8;
      track.scrollBy({ left: dir * step * 2, behavior: "smooth" });
    };

    prevBtn?.addEventListener("click", () => scrollByCard(-1));
    nextBtn?.addEventListener("click", () => scrollByCard(1));

    const updateNavState = () => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (prevBtn) prevBtn.disabled = track.scrollLeft <= 4;
      if (nextBtn) nextBtn.disabled = track.scrollLeft >= maxScroll - 4;
    };
    updateNavState();
    track.addEventListener("scroll", updateNavState, { passive: true });

    // deixa a roda do mouse vertical mover o carrossel horizontalmente —
    // sem isso, um mouse comum (sem trackpad) não consegue rolar o carrossel de jeito nenhum.
    // Touchpad dispara MUITO mais eventos "wheel" por segundo que uma roda de mouse (e ainda
    // continua com inércia depois que o dedo sai), então sem amortecer e limitar o deltaY por
    // evento, o carrossel "voa" longe demais num gesto de touchpad.
    const WHEEL_DAMPING = 0.5;
    const WHEEL_MAX_STEP = 70;
    track.addEventListener(
      "wheel",
      (e) => {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // já é gesto horizontal, deixa nativo
        e.preventDefault();
        const damped = e.deltaY * WHEEL_DAMPING;
        const clamped = Math.sign(damped) * Math.min(Math.abs(damped), WHEEL_MAX_STEP);
        track.scrollBy({ left: clamped, behavior: "auto" });
      },
      { passive: false },
    );

    // arrastar com o mouse (clique e arraste), padrão comum em carrosséis de catálogo.
    // Os listeners de mousemove/mouseup ficam em `window` (o arraste continua funcionando
    // mesmo se o cursor sair do carrossel no meio do gesto), então precisam ser removidos
    // explicitamente a cada re-render — senão cada setProducts()/setLoading() empilha
    // listeners novos em window para sempre (o innerHTML anterior é descartado, mas os
    // listeners em window não somem sozinhos).
    this._dragState ??= { isDragging: false, dragStartX: 0, scrollStart: 0, moved: false };
    const drag = this._dragState;

    if (this._onMouseMove) window.removeEventListener("mousemove", this._onMouseMove);
    if (this._onMouseUp) window.removeEventListener("mouseup", this._onMouseUp);

    track.addEventListener("mousedown", (e) => {
      drag.isDragging = true;
      drag.moved = false;
      drag.dragStartX = e.pageX;
      drag.scrollStart = track.scrollLeft;
    });

    this._onMouseMove = (e) => {
      if (!drag.isDragging) return;
      const delta = e.pageX - drag.dragStartX;
      if (Math.abs(delta) > 3) drag.moved = true;
      track.scrollLeft = drag.scrollStart - delta;
    };
    window.addEventListener("mousemove", this._onMouseMove);

    this._onMouseUp = () => {
      drag.isDragging = false;
    };
    window.addEventListener("mouseup", this._onMouseUp);

    // se o usuário arrastou, o clique subsequente no link não deve navegar
    // (senão todo drag termina abrindo o produto embaixo do cursor)
    track.addEventListener(
      "click",
      (e) => {
        if (drag.moved) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      { capture: true },
    );
  }

  disconnectedCallback() {
    if (this._onMouseMove) window.removeEventListener("mousemove", this._onMouseMove);
    if (this._onMouseUp) window.removeEventListener("mouseup", this._onMouseUp);
  }
}

customElements.define("product-carousel", ProductCarousel);
