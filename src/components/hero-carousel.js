const SLIDE_INTERVAL = 5000;
const FADE_DURATION = "duration-[1500ms]"; // animação lenta, como pedido

class HeroCarousel extends HTMLElement {
  connectedCallback() {
    this.images = ["/banner-guerreiras.png", "/banner-rodolfo.png"];
    this.index = 0;

    // monta o DOM uma única vez — trocar de slide só alterna classes nos
    // mesmos nós depois. Recriar via innerHTML a cada troca mata a transição
    // (o elemento nasceria direto no estado final, sem nada pra animar a partir)
    this.renderShell();
    this.startAutoplay();

    // pausa a troca automática com o mouse em cima, comum em carrosséis assim
    this.addEventListener("mouseenter", () => this.stopAutoplay());
    this.addEventListener("mouseleave", () => this.startAutoplay());
  }

  disconnectedCallback() {
    this.stopAutoplay();
  }

  startAutoplay() {
    this.stopAutoplay();
    this.timer = setInterval(() => this.next(), SLIDE_INTERVAL);
  }

  stopAutoplay() {
    clearInterval(this.timer);
  }

  renderShell() {
    this.innerHTML = `
      <div class="relative h-[400px] overflow-hidden bg-[#102977]">
        ${this.images
          .map(
            (src, i) => `
          <div class="hero-slide absolute inset-0 bg-contain bg-center bg-no-repeat transition-opacity ${FADE_DURATION} ease-in-out ${i === 0 ? "opacity-100" : "opacity-0"}"
               style="background-image: url('${src}')"></div>
        `,
          )
          .join("")}

        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          ${this.images
            .map(
              (_, i) => `
            <button type="button" data-dot="${i}" aria-label="Ir para o slide ${i + 1}"
                    class="hero-dot h-2 rounded-full bg-white transition-all duration-300 ${i === 0 ? "w-6 opacity-100" : "w-2 opacity-50"}"></button>
          `,
            )
            .join("")}
        </div>
      </div>
    `;

    this.slides = [...this.querySelectorAll(".hero-slide")];
    this.dots = [...this.querySelectorAll(".hero-dot")];

    this.dots.forEach((btn, i) =>
      btn.addEventListener("click", () => {
        this.goTo(i);
        this.startAutoplay(); // reinicia a contagem ao trocar manualmente
      }),
    );
  }

  next() {
    this.goTo((this.index + 1) % this.images.length);
  }

  goTo(i) {
    this.index = i;
    this.slides.forEach((slide, idx) => {
      slide.classList.toggle("opacity-100", idx === i);
      slide.classList.toggle("opacity-0", idx !== i);
    });
    this.dots.forEach((dot, idx) => {
      dot.classList.toggle("w-6", idx === i);
      dot.classList.toggle("opacity-100", idx === i);
      dot.classList.toggle("w-2", idx !== i);
      dot.classList.toggle("opacity-50", idx !== i);
    });
  }
}

customElements.define("hero-carousel", HeroCarousel);
