import { navigate } from "../router.js";
import { productService } from "../services/product.js";
import { escapeHtml } from "../utils/html.js";

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

class SearchBar extends HTMLElement {
  constructor() {
    super();
    this.suggestions = [];
    this.activeIndex = -1;
    this.debouncedSearch = debounce(this.fetchSuggestions.bind(this), 250);
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
      <div class="relative w-full max-w-md sm:max-w-lg md:max-w-2xl">
        <form id="search-form" role="search" class="flex items-center justify-between border border-secondary gap-2 sm:gap-3 rounded-full px-4 sm:px-6 bg-surface transition-colors">
          <input
            type="text"
            id="search-input"
            autocomplete="off"
            placeholder="Pesquise aqui algum produto"
            role="combobox"
            aria-expanded="false"
            aria-controls="suggestions-list"
            aria-autocomplete="list"
            aria-activedescendant=""
            class="bg-transparent outline-none text-sm text-text placeholder:text-text/40 w-full py-2 min-w-0"
          />
          <button type="submit" aria-label="Buscar" class="shrink-0 text-primary hover:text-accent transition-colors cursor-pointer">
            <svg class="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.54297 2.12891C4.98111 2.12891 2.12891 4.98111 2.12891 8.54297C2.12897 12.1048 4.98115 14.957 8.54297 14.957C12.1047 14.957 14.957 12.1047 14.957 8.54297C14.957 4.98115 12.1048 2.12897 8.54297 2.12891ZM14.957 15.1836L14.8105 15.0371L14.4561 14.6816L14.1299 14.3555L13.7783 14.6543C12.3663 15.8557 10.5348 16.5859 8.54297 16.5859C6.40992 16.5859 4.36379 15.7387 2.85547 14.2305C1.34717 12.7222 0.50003 10.676 0.5 8.54297C0.5 6.40987 1.34714 4.3638 2.85547 2.85547C4.3638 1.34714 6.40987 0.5 8.54297 0.5C10.676 0.50003 12.7222 1.34717 14.2305 2.85547C15.7387 4.36379 16.5859 6.40992 16.5859 8.54297C16.5859 10.5348 15.8557 12.3663 14.6543 13.7783L14.3555 14.1299L14.6816 14.4561L15.0371 14.8105L15.1836 14.957H16.2217L22.293 21.0283L21.0283 22.293L14.957 16.2217V15.1836Z" fill="currentColor" stroke="currentColor"/>
            </svg>
          </button>
        </form>

        <ul id="suggestions-list"
            role="listbox"
            aria-label="Sugestões de produtos"
            class="absolute left-0 right-0 mt-2 bg-surface border border-primary/20 rounded-lg shadow-lg overflow-hidden hidden z-50 max-h-64 overflow-y-auto">
        </ul>
      </div>
    `;

    this.input = this.querySelector("#search-input");
    this.form = this.querySelector("#search-form");
    this.list = this.querySelector("#suggestions-list");

    this.input.addEventListener("input", () => {
      const value = this.input.value.trim();
      if (!value) {
        this.closeDropdown();
        return;
      }
      this.debouncedSearch(value);
    });

    this.input.addEventListener("keydown", (e) => this.handleKeydown(e));

    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = this.input.value.trim();
      if (!value) return;
      this.closeDropdown();
      navigate(`/search?name=${encodeURIComponent(value)}`);
    });

    document.addEventListener("click", (e) => {
      if (!this.contains(e.target)) this.closeDropdown();
    });
  }

  async fetchSuggestions(query) {
    try {
      const results = await productService.search(query);
      this.suggestions = results.slice(0, 5);
      this.activeIndex = -1;
      this.renderSuggestions();
    } catch (err) {
      this.closeDropdown();
    }
  }

  renderSuggestions() {
    if (this.suggestions.length === 0) {
      this.closeDropdown();
      return;
    }

    this.list.innerHTML = this.suggestions
    .map(
      (p, i) => `
      <li id="suggestion-${p.id}"
          role="option"
          data-id="${p.id}"
          aria-selected="${i === this.activeIndex}"
          class="px-4 py-2 text-sm cursor-pointer flex justify-between items-center ${i === this.activeIndex ? "bg-primary/10 text-primary" : "text-text hover:bg-primary/5"}">
        <span>${escapeHtml(p.name)}</span>
        <span class="text-xs text-text/70">R$ ${Number(p.price).toFixed(2)}</span>
      </li>
    `
    )
    .join("");

    this.list.classList.remove("hidden");
    this.input.setAttribute("aria-expanded", "true");

    this.list.querySelectorAll("li").forEach((li) => {
      li.addEventListener("click", () => this.goToProduct(li.dataset.id));
    });

    this.updateActiveDescendant();
  }

  updateActiveDescendant() {
    const active = this.activeIndex >= 0 ? this.suggestions[this.activeIndex] : null;
    this.input.setAttribute("aria-activedescendant", active ? `suggestion-${active.id}` : "");
  }

  handleKeydown(e) {
    if (this.suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.activeIndex = (this.activeIndex + 1) % this.suggestions.length;
      this.renderSuggestions();
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      this.activeIndex =
        (this.activeIndex - 1 + this.suggestions.length) % this.suggestions.length;
      this.renderSuggestions();
    }

    if (e.key === "Tab") {
      const target = this.activeIndex >= 0 ? this.suggestions[this.activeIndex] : this.suggestions[0];
      if (target) {
        e.preventDefault();
        this.goToProduct(target.id);
      }
    }

    if (e.key === "Escape") {
      this.closeDropdown();
    }

    // Enter falls through to form submit — full search, ignores highlight
  }

  goToProduct(id) {
    this.closeDropdown();
    this.input.value = "";
    navigate(`/product/${id}`);
  }

  closeDropdown() {
    this.suggestions = [];
    this.activeIndex = -1;
    this.list.classList.add("hidden");
    this.list.innerHTML = "";
    this.input.setAttribute("aria-expanded", "false");
    this.input.setAttribute("aria-activedescendant", "");
  }
}

customElements.define("search-bar", SearchBar);
