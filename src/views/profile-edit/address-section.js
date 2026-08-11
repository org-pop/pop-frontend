import { addressService } from "../../services/adress.js";
import { showToast } from "../../components/toast.js";
import { UFS } from "../../utils/brazil-states.js";
import { isSameAddress } from "../../utils/address-utils.js";
import { escapeHtml } from "../../utils/html.js";

const TRASH_ICON = `<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>`;

// Extraído de profile-edit.js pela mesma razão do phone-section.js — tira
// essas 3 flags de estado do arquivo principal. Sem "editar": o backend só
// tem create/delete de endereço, não update.
export function createAddressSection(user, onChange) {
  let addresses = [];
  let addressesLoading = true;
  let addingAddress = false;
  let addressBusy = false;

  function renderHtml() {
    return `
      <div class="flex items-center justify-between">
        <h2 class="font-semibold text-text">Endereços</h2>
        ${
          !addingAddress
            ? `
          <button type="button" id="add-address-btn" ${addressBusy ? "disabled" : ""}
                  class="text-sm text-primary hover:underline disabled:opacity-50">
            + Adicionar endereço
          </button>
        `
            : ""
        }
      </div>

      ${renderBody()}

      ${addingAddress ? addressForm() : ""}
    `;
  }

  function renderBody() {
    if (addressesLoading) {
      return `<p class="text-sm text-text/70">Carregando...</p>`;
    }
    if (addresses.length === 0) {
      return `<p class="text-sm text-text/70">Nenhum endereço cadastrado.</p>`;
    }
    return `
      <ul class="flex flex-col gap-2">
        ${addresses.map((a) => addressRow(a)).join("")}
      </ul>
    `;
  }

  function addressRow(a) {
    return `
      <li class="flex items-start justify-between gap-3 border border-secondary/30 rounded-xl p-3">
        <span class="text-sm text-text">
          ${escapeHtml(a.street)}, ${escapeHtml(a.number)} — ${escapeHtml(a.city)}/${escapeHtml(a.state)}<br />
          <span class="text-text/70">CEP ${escapeHtml(a.zipCode)}</span>
        </span>
        <button type="button" data-action="delete-address" data-id="${a.id}" ${addressBusy ? "disabled" : ""}
                aria-label="Excluir endereço" class="text-text/70 hover:text-red-500 p-1.5 disabled:opacity-50 shrink-0">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TRASH_ICON}</svg>
        </button>
      </li>
    `;
  }

  function addressForm() {
    return `
      <form id="add-address-form" class="flex flex-col gap-3 pt-2 border-t border-secondary/20">
        <div class="grid grid-cols-[1fr_100px] gap-3">
          <input id="new-address-zip" required placeholder="CEP" aria-label="CEP" maxlength="9" ${addressBusy ? "disabled" : ""}
                 class="rounded-xl px-4 py-2 border bg-surface border-secondary/60 text-text placeholder:text-text/40 focus:border-primary outline-none transition-colors" />
          <select id="new-address-state" required aria-label="Estado (UF)" ${addressBusy ? "disabled" : ""}
                  class="rounded-xl px-4 py-2 border bg-surface border-secondary/60 text-text focus:border-primary outline-none transition-colors">
            <option value="" disabled selected>UF</option>
            ${UFS.map((uf) => `<option value="${uf}">${uf}</option>`).join("")}
          </select>
        </div>

        <input id="new-address-city" required placeholder="Cidade" aria-label="Cidade" ${addressBusy ? "disabled" : ""}
               class="rounded-xl px-4 py-2 border bg-surface border-secondary/60 text-text placeholder:text-text/40 focus:border-primary outline-none transition-colors" />

        <div class="grid grid-cols-[1fr_120px] gap-3">
          <input id="new-address-street" required placeholder="Rua" aria-label="Rua" ${addressBusy ? "disabled" : ""}
                 class="rounded-xl px-4 py-2 border bg-surface border-secondary/60 text-text placeholder:text-text/40 focus:border-primary outline-none transition-colors" />
          <input id="new-address-number" required placeholder="Número" aria-label="Número" ${addressBusy ? "disabled" : ""}
                 class="rounded-xl px-4 py-2 border bg-surface border-secondary/60 text-text placeholder:text-text/40 focus:border-primary outline-none transition-colors" />
        </div>

        <p id="address-form-feedback" class="text-sm hidden"></p>

        <div class="flex items-center gap-2">
          <button type="submit" ${addressBusy ? "disabled" : ""}
                  class="bg-primary hover:bg-accent disabled:bg-secondary/40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm transition-colors">
            Salvar
          </button>
          <button type="button" id="cancel-add-address" ${addressBusy ? "disabled" : ""}
                  class="text-text/70 hover:text-text px-2 text-sm disabled:opacity-50">
            Cancelar
          </button>
        </div>
      </form>
    `;
  }

  function wireEvents(container) {
    container.querySelector("#add-address-btn")?.addEventListener("click", () => {
      addingAddress = true;
      onChange();
      container.querySelector("#new-address-zip")?.focus();
    });

    container.querySelector("#cancel-add-address")?.addEventListener("click", () => {
      addingAddress = false;
      onChange();
    });

    container.querySelector("#add-address-form")?.addEventListener("submit", (e) => handleAddAddress(e, container));

    container.querySelectorAll('[data-action="delete-address"]').forEach((btn) =>
      btn.addEventListener("click", () => handleDeleteAddress(Number(btn.dataset.id))),
    );
  }

  async function load() {
    try {
      addresses = await addressService.getByUser(user.id);
    } catch (err) {
      console.error(err);
      addresses = [];
    }
    addressesLoading = false;
    onChange();
  }

  async function handleAddAddress(e, container) {
    e.preventDefault();
    if (addressBusy) return;

    const address = {
      street: container.querySelector("#new-address-street").value.trim(),
      number: container.querySelector("#new-address-number").value.trim(),
      city: container.querySelector("#new-address-city").value.trim(),
      state: container.querySelector("#new-address-state").value,
      zipCode: container.querySelector("#new-address-zip").value.trim(),
    };

    if (addresses.some((a) => isSameAddress(a, address))) {
      showToast("Esse endereço já está cadastrado.", "error");
      return;
    }

    addressBusy = true;
    onChange();

    try {
      const created = await addressService.add(user.id, address);
      addresses = [...addresses, created];
      addingAddress = false;
      showToast("Endereço adicionado!");
    } catch (err) {
      showToast(err.message || "Erro ao adicionar endereço.", "error");
    } finally {
      addressBusy = false;
      onChange();
    }
  }

  async function handleDeleteAddress(id) {
    if (addressBusy) return;

    addressBusy = true;
    onChange();

    try {
      await addressService.delete(id);
      addresses = addresses.filter((a) => a.id !== id);
      showToast("Endereço removido!");
    } catch (err) {
      showToast(err.message || "Erro ao remover endereço.", "error");
    } finally {
      addressBusy = false;
      onChange();
    }
  }

  return { renderHtml, wireEvents, load };
}
