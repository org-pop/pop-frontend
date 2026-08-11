import { productService } from "../services/product.js";
import { showToast } from "../components/toast.js";
import { escapeHtml } from "../utils/html.js";
import { imageSrc } from "../utils/image.js";
import { RARITIES } from "../utils/products.js";

// Único valor de franquia do catálogo — todo produto pertence à mesma turma,
// então o campo fica travado em vez de editável.
const FRANCHISE = "2°D";

// img.src="" faz o navegador recarregar o próprio documento como imagem (pedido
// vazio == URL do documento atual, pela spec) — usamos um pixel transparente
// como estado "sem imagem" em vez de deixar o src esvaziar.
const EMPTY_IMG = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
function previewSrc(imageUrl) {
  return imageUrl ? imageSrc(imageUrl) : EMPTY_IMG;
}

// O modal precisa viver fora de #app: o router aplica `.route-enter` (uma
// animação com transform) no próprio #app a cada troca de rota, e qualquer
// ancestral com transform ativo vira containing block de filhos
// `position: fixed` — o modal ficaria fixado relativo ao #app (que é bem mais
// alto que a viewport por causa do grid de produtos) em vez da tela. Mesmo
// motivo pelo qual <side-menu> fica fora de #app no index.html.
let modalOverlay = null;
let modalPanel = null;

function ensureModalMounted() {
  if (modalOverlay) return;

  modalOverlay = document.createElement("div");
  modalOverlay.id = "admin-modal-overlay";
  modalOverlay.className = "fixed inset-0 z-50 bg-black/50 hidden items-center justify-center p-4";
  modalOverlay.innerHTML = `
    <div id="admin-modal-panel"
         class="bg-surface rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5"></div>
  `;
  document.body.appendChild(modalOverlay);
  modalPanel = modalOverlay.querySelector("#admin-modal-panel");

  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalOverlay.classList.contains("hidden")) closeModal();
  });
  // back/forward do navegador não passa pelos links data-link — sem isso o
  // modal (que vive fora de #app) ficaria aberto por cima da rota nova
  window.addEventListener("popstate", closeModal);
}

function openModal(html) {
  modalPanel.innerHTML = html;
  modalOverlay.classList.remove("hidden");
  modalOverlay.classList.add("flex");
  document.body.classList.add("overflow-hidden");
}

function closeModal() {
  modalOverlay.classList.add("hidden");
  modalOverlay.classList.remove("flex");
  document.body.classList.remove("overflow-hidden");
}

export function renderAdminProducts(container) {
  let products = [];
  let searchTerm = "";
  let isSaving = false;

  ensureModalMounted();
  closeModal(); // reseta um estado aberto deixado por uma visita anterior a esta view

  container.innerHTML = shell();
  wireShellEvents();
  load();

  async function load() {
    const grid = container.querySelector("#admin-product-grid");
    try {
      products = await productService.getAll();
      renderGrid();
    } catch (err) {
      console.error(err);
      grid.innerHTML = `<p class="col-span-full text-center text-red-500 py-10">Não foi possível carregar os produtos. Confira se o servidor está rodando e tente novamente.</p>`;
      container.querySelector("#admin-count").textContent = "";
    }
  }

  function renderGrid() {
    const grid = container.querySelector("#admin-product-grid");
    const term = searchTerm.toLowerCase();
    const filtered = term ? products.filter((p) => p.name.toLowerCase().includes(term)) : products;

    container.querySelector("#admin-count").textContent =
      `${products.length} produto${products.length === 1 ? "" : "s"} cadastrado${products.length === 1 ? "" : "s"}`;

    if (filtered.length === 0) {
      grid.innerHTML = `
        <p class="col-span-full text-center text-text/70 py-10">
          Nenhum produto encontrado${searchTerm ? ` para "${escapeHtml(searchTerm)}"` : ""}.
        </p>
      `;
      return;
    }

    grid.innerHTML = filtered.map(adminCard).join("");

    grid.querySelectorAll('[data-action="edit"]').forEach((btn) =>
      btn.addEventListener("click", () => openEdit(Number(btn.dataset.id))),
    );
    grid.querySelectorAll('[data-action="delete"]').forEach((btn) =>
      btn.addEventListener("click", () => openDelete(Number(btn.dataset.id))),
    );
  }

  function wireShellEvents() {
    container.querySelector("#new-product-btn").addEventListener("click", () => openEdit(null));

    container.querySelector("#admin-search").addEventListener("input", (e) => {
      searchTerm = e.target.value.trim();
      renderGrid();
    });
  }

  function openEdit(id) {
    const existing = id ? products.find((p) => p.id === id) : null;
    openModal(formHtml(existing));

    const preview = modalPanel.querySelector("#modal-image-preview");
    const imageUrlInput = modalPanel.querySelector("#imageUrl");
    const fileInput = modalPanel.querySelector("#modal-image-file");
    let pickedObjectUrl = null; // revogado ao trocar/reabrir para não vazar memória

    modalPanel.querySelector("#modal-close").addEventListener("click", closeModal);
    modalPanel.querySelector("#modal-cancel").addEventListener("click", closeModal);

    imageUrlInput.addEventListener("input", (e) => {
      if (pickedObjectUrl) {
        URL.revokeObjectURL(pickedObjectUrl);
        pickedObjectUrl = null;
      }
      preview.src = previewSrc(e.target.value.trim());
    });

    modalPanel.querySelector("#modal-image-pick").addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      if (pickedObjectUrl) URL.revokeObjectURL(pickedObjectUrl);
      pickedObjectUrl = URL.createObjectURL(file);
      preview.src = pickedObjectUrl;

      // A API só guarda o nome do arquivo (sem extensão) — a imagem em si
      // precisa existir em public/images/<nome>.png, como já era feito na mão.
      const baseName = file.name.replace(/\.[^./\\]+$/, "");
      imageUrlInput.value = baseName;
      modalPanel.querySelector("#modal-image-filename").textContent = file.name;
    });

    modalPanel.querySelector("#admin-product-form").addEventListener("submit", (e) => handleSubmit(e, existing));
  }

  function openDelete(id) {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    openModal(confirmDeleteHtml(product));
    modalPanel.querySelector("#modal-cancel").addEventListener("click", closeModal);
    modalPanel.querySelector("#confirm-delete-btn").addEventListener("click", () => handleDelete(product));
  }

  async function handleSubmit(e, existing) {
    e.preventDefault();
    if (isSaving) return;

    const form = e.target;
    const payload = {
      name: form.name.value.trim(),
      description: form.description.value.trim(),
      price: Number(form.price.value),
      stock: Number(form.stock.value),
      imageUrl: form.imageUrl.value.trim(),
      imageAltText: form.imageAltText.value.trim(),
      franchise: FRANCHISE,
      rarity: form.rarity.value.trim(),
    };

    if (!payload.name || !payload.imageUrl || Number.isNaN(payload.price) || Number.isNaN(payload.stock)) {
      showToast("Preencha nome, imagem, preço e estoque.", "error");
      return;
    }
    if (payload.price < 0 || payload.stock < 0) {
      showToast("Preço e estoque não podem ser negativos.", "error");
      return;
    }

    isSaving = true;
    const saveBtn = panelSaveBtn(form);
    saveBtn.disabled = true;
    saveBtn.textContent = existing ? "Salvando..." : "Criando...";

    try {
      if (existing) {
        const updated = await productService.update(existing.id, payload);
        products = products.map((p) => (p.id === existing.id ? { ...p, ...updated } : p));
        showToast("Produto atualizado!");
      } else {
        const created = await productService.create(payload);
        products = [...products, created];
        showToast("Produto criado!");
      }
      closeModal();
      renderGrid();
    } catch (err) {
      showToast(err.message || "Erro ao salvar produto.", "error");
      saveBtn.disabled = false;
      saveBtn.textContent = existing ? "Salvar alterações" : "Criar produto";
    } finally {
      isSaving = false;
    }
  }

  async function handleDelete(product) {
    const btn = modalPanel.querySelector("#confirm-delete-btn");
    btn.disabled = true;
    btn.textContent = "Excluindo...";

    try {
      await productService.delete(product.id);
      products = products.filter((p) => p.id !== product.id);
      showToast("Produto excluído.");
      closeModal();
      renderGrid();
    } catch (err) {
      showToast(err.message || "Erro ao excluir produto.", "error");
      btn.disabled = false;
      btn.textContent = "Excluir";
    }
  }
}

function panelSaveBtn(form) {
  return form.querySelector("#modal-save");
}

function shell() {
  return `
    <section class="flex flex-col gap-8 max-w-6xl mx-auto px-6 py-10 min-h-screen">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-lg font-bold text-primary">Administração de produtos</h1>
          <p id="admin-count" class="text-sm text-text/70 mt-1">Carregando...</p>
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto">
          <input id="admin-search" type="search" placeholder="Buscar por nome..."
                 class="rounded-full px-4 py-2 border bg-surface border-secondary/60 text-text text-sm focus:border-primary outline-none transition-colors w-full sm:w-56" />
          <button id="new-product-btn" type="button"
                  class="bg-primary hover:bg-accent text-white px-5 py-2.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 shrink-0">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Novo produto
          </button>
        </div>
      </div>

      <div id="admin-product-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        ${Array.from({ length: 6 })
          .map(
            () => `
          <div class="border border-secondary/40 rounded-2xl overflow-hidden">
            <div class="skeleton-shimmer aspect-video"></div>
            <div class="p-4 flex flex-col gap-2">
              <div class="skeleton-shimmer h-4 w-3/4 rounded"></div>
              <div class="skeleton-shimmer h-3 w-1/2 rounded"></div>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function adminCard(p) {
  const outOfStock = Number(p.stock) <= 0;
  return `
    <div class="border border-secondary/40 rounded-2xl bg-surface overflow-hidden flex flex-col">
      <div class="aspect-video bg-bg overflow-hidden">
        <img src="${imageSrc(p.imageUrl)}" alt="${escapeHtml(p.imageAltText || p.name)}" class="w-full h-full object-cover" />
      </div>
      <div class="p-4 flex flex-col gap-2 flex-1">
        <div class="flex items-start justify-between gap-2">
          <h3 class="text-sm font-semibold text-text line-clamp-2">${escapeHtml(p.name)}</h3>
          <span class="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${outOfStock ? "bg-red-500/10 text-red-500" : "bg-secondary/10 text-text/70"}">
            ${outOfStock ? "Sem estoque" : `${p.stock} un.`}
          </span>
        </div>
        <p class="text-xs text-text/60">${escapeHtml(p.franchise || "Sem franquia")}</p>
        <p class="text-primary font-bold mt-auto">R$ ${Number(p.price).toFixed(2)}</p>
        <div class="flex items-center gap-2 mt-2">
          <button type="button" data-action="edit" data-id="${p.id}"
                  class="flex-1 border border-secondary/60 text-text hover:bg-secondary/10 px-3 py-2 rounded-full text-xs font-medium transition-colors">
            Editar
          </button>
          <button type="button" data-action="delete" data-id="${p.id}" aria-label="Excluir ${escapeHtml(p.name)}"
                  class="border border-red-500/40 text-red-500 hover:bg-red-500/10 px-2.5 py-2 rounded-full transition-colors">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function formHtml(product) {
  const isEdit = Boolean(product?.id);
  return `
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-bold text-text">${isEdit ? "Editar produto" : "Novo produto"}</h2>
      <button type="button" id="modal-close" aria-label="Fechar" class="text-text/60 hover:text-primary transition-colors">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <form id="admin-product-form" class="flex flex-col gap-4">
      <div class="flex items-start gap-4">
        <div class="w-20 h-20 rounded-xl bg-bg overflow-hidden shrink-0 border border-secondary/40">
          <img id="modal-image-preview" src="${previewSrc(product?.imageUrl)}" alt="" class="w-full h-full object-cover" />
        </div>
        <div class="flex-1 flex flex-col gap-2">
          <input type="file" id="modal-image-file" accept="image/*" class="hidden" />
          <div class="flex items-center gap-2">
            <button type="button" id="modal-image-pick"
                    class="border border-secondary/60 text-text hover:bg-secondary/10 px-4 py-2 rounded-full text-xs font-medium transition-colors shrink-0">
              Escolher arquivo
            </button>
            <span id="modal-image-filename" class="text-xs text-text/60 truncate">Nenhum arquivo selecionado</span>
          </div>
          ${formField("Imagem (nome do arquivo)", "imageUrl", product?.imageUrl, { placeholder: "ex: arakaki", required: true })}
          <p class="text-[11px] text-text/50 leading-snug">
            Ao escolher um arquivo, o nome acima é preenchido automaticamente. O arquivo de imagem ainda precisa existir em <code>public/images/</code> com esse nome.
          </p>
        </div>
      </div>

      ${formField("Texto alternativo da imagem", "imageAltText", product?.imageAltText)}
      ${formField("Nome", "name", product?.name, { required: true })}

      <div class="flex flex-col gap-1.5">
        <label for="description" class="text-xs font-medium text-text/70 uppercase tracking-wide">Descrição</label>
        <textarea id="description" name="description" rows="3"
                  class="rounded-xl px-4 py-2.5 border bg-surface border-secondary/60 text-text focus:border-primary outline-none transition-colors resize-none">${escapeHtml(product?.description || "")}</textarea>
      </div>

      <div class="grid grid-cols-2 gap-4">
        ${formField("Preço (R$)", "price", product?.price, { type: "number", step: "0.01", min: "0", required: true })}
        ${formField("Estoque", "stock", product?.stock, { type: "number", step: "1", min: "0", required: true })}
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-1.5">
          <label for="franchise" class="text-xs font-medium text-text/70 uppercase tracking-wide">Franquia</label>
          <input type="text" id="franchise" value="${FRANCHISE}" disabled
                 class="rounded-xl px-4 py-2.5 border bg-secondary/10 border-secondary/40 text-text/70 cursor-not-allowed" />
        </div>
        ${selectField("Raridade", "rarity", product?.rarity, RARITIES)}
      </div>

      <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
        <button type="button" id="modal-cancel"
                class="border border-secondary/60 text-text hover:bg-secondary/10 px-5 py-2.5 rounded-full transition-colors">
          Cancelar
        </button>
        <button type="submit" id="modal-save"
                class="bg-primary hover:bg-accent disabled:bg-secondary/40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-full transition-colors">
          ${isEdit ? "Salvar alterações" : "Criar produto"}
        </button>
      </div>
    </form>
  `;
}

function formField(label, id, value, { type = "text", placeholder, required = false, step, min } = {}) {
  return `
    <div class="flex flex-col gap-1.5">
      <label for="${id}" class="text-xs font-medium text-text/70 uppercase tracking-wide">${label}</label>
      <input type="${type}" id="${id}" name="${id}" value="${escapeHtml(value ?? "")}"
             ${placeholder ? `placeholder="${escapeHtml(placeholder)}"` : ""}
             ${step ? `step="${step}"` : ""} ${min ? `min="${min}"` : ""} ${required ? "required" : ""}
             class="rounded-xl px-4 py-2.5 border bg-surface border-secondary/60 text-text focus:border-primary outline-none transition-colors" />
    </div>
  `;
}

function selectField(label, id, value, options) {
  return `
    <div class="flex flex-col gap-1.5">
      <label for="${id}" class="text-xs font-medium text-text/70 uppercase tracking-wide">${label}</label>
      <select id="${id}" name="${id}"
              class="rounded-xl px-4 py-2.5 border bg-surface border-secondary/60 text-text focus:border-primary outline-none transition-colors">
        <option value="" ${!value ? "selected" : ""}>Selecione...</option>
        ${options
          .map(
            (opt) =>
              `<option value="${escapeHtml(opt.value)}" ${opt.value === value ? "selected" : ""}>${escapeHtml(opt.label)}</option>`,
          )
          .join("")}
      </select>
    </div>
  `;
}

function confirmDeleteHtml(product) {
  return `
    <h2 class="text-lg font-bold text-text">Excluir produto</h2>
    <p class="text-sm text-text/70">
      Tem certeza que deseja excluir <strong class="text-text">${escapeHtml(product.name)}</strong>? Essa ação não pode ser desfeita.
    </p>
    <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
      <button type="button" id="modal-cancel"
              class="border border-secondary/60 text-text hover:bg-secondary/10 px-5 py-2.5 rounded-full transition-colors">
        Cancelar
      </button>
      <button type="button" id="confirm-delete-btn"
              class="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-full transition-colors">
        Excluir
      </button>
    </div>
  `;
}
