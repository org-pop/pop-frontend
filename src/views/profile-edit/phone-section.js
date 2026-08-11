import { phoneService } from "../../services/phone.js";
import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";

const ICONS = {
  edit: `<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>`,
  trash: `<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>`,
  check: `<path d="M20 6L9 17l-5-5"/>`,
  x: `<path d="M18 6L6 18M6 6l12 12"/>`,
};

// Um telefone por usuário na UI, com adicionar/editar/excluir — extraído de
// profile-edit.js pra tirar essas 5 flags de estado do arquivo principal.
// `onChange` é a re-renderização do container pai (profile-edit.js define ela).
export function createPhoneSection(user, onChange) {
  let phones = [];
  let phonesLoading = true;
  let addingPhone = false;
  let editingPhoneId = null;
  let phoneBusy = false;

  function renderHtml() {
    return `
      <div class="flex items-center justify-between">
        <h2 class="font-semibold text-text">Telefones</h2>
        ${
          !addingPhone
            ? `
          <button type="button" id="add-phone-btn" ${phoneBusy ? "disabled" : ""}
                  class="text-sm text-primary hover:underline disabled:opacity-50">
            + Adicionar telefone
          </button>
        `
            : ""
        }
      </div>

      ${renderBody()}

      ${addingPhone ? phoneForm() : ""}
    `;
  }

  function renderBody() {
    if (phonesLoading) {
      return `<p class="text-sm text-text/70">Carregando...</p>`;
    }
    if (phones.length === 0) {
      return `<p class="text-sm text-text/70">Nenhum telefone cadastrado.</p>`;
    }
    return `
      <ul class="flex flex-col gap-2">
        ${phones.map((p) => phoneRow(p)).join("")}
      </ul>
    `;
  }

  function phoneRow(p) {
    if (editingPhoneId === p.id) {
      return `
        <li class="flex items-center gap-2">
          <input type="tel" inputmode="numeric" aria-label="Número de telefone" class="phone-edit-input flex-1 rounded-xl px-4 py-2 border bg-surface border-secondary/60 text-text focus:border-primary outline-none transition-colors"
                 value="${escapeHtml(p.number)}" placeholder="(11) 91234-5678" ${phoneBusy ? "disabled" : ""} />
          <button type="button" data-action="save-phone" data-id="${p.id}" ${phoneBusy ? "disabled" : ""}
                  aria-label="Salvar telefone" class="text-primary hover:text-accent p-1.5 disabled:opacity-50 shrink-0">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${ICONS.check}</svg>
          </button>
          <button type="button" data-action="cancel-edit-phone" ${phoneBusy ? "disabled" : ""}
                  aria-label="Cancelar edição" class="text-text/70 hover:text-text p-1.5 disabled:opacity-50 shrink-0">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.x}</svg>
          </button>
        </li>
      `;
    }
    return `
      <li class="flex items-center justify-between gap-2 py-1">
        <span class="text-sm text-text">${escapeHtml(p.number)}</span>
        <div class="flex items-center gap-1">
          <button type="button" data-action="edit-phone" data-id="${p.id}" ${phoneBusy ? "disabled" : ""}
                  aria-label="Editar telefone" class="text-text/70 hover:text-primary p-1.5 disabled:opacity-50">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.edit}</svg>
          </button>
          <button type="button" data-action="delete-phone" data-id="${p.id}" ${phoneBusy ? "disabled" : ""}
                  aria-label="Excluir telefone" class="text-text/70 hover:text-red-500 p-1.5 disabled:opacity-50">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.trash}</svg>
          </button>
        </div>
      </li>
    `;
  }

  function phoneForm() {
    return `
      <form id="add-phone-form" class="flex items-center gap-2 pt-2 border-t border-secondary/20">
        <input type="tel" inputmode="numeric" id="new-phone-number" required placeholder="(11) 91234-5678" aria-label="Número de telefone" ${phoneBusy ? "disabled" : ""}
               class="flex-1 rounded-xl px-4 py-2 border bg-surface border-secondary/60 text-text focus:border-primary outline-none transition-colors" />
        <button type="submit" ${phoneBusy ? "disabled" : ""}
                class="bg-primary hover:bg-accent disabled:bg-secondary/40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm transition-colors shrink-0">
          Salvar
        </button>
        <button type="button" id="cancel-add-phone" ${phoneBusy ? "disabled" : ""}
                class="text-text/70 hover:text-text px-2 text-sm disabled:opacity-50 shrink-0">
          Cancelar
        </button>
      </form>
    `;
  }

  function wireEvents(container) {
    container.querySelector("#add-phone-btn")?.addEventListener("click", () => {
      addingPhone = true;
      onChange();
      container.querySelector("#new-phone-number")?.focus();
    });

    container.querySelector("#cancel-add-phone")?.addEventListener("click", () => {
      addingPhone = false;
      onChange();
    });

    container.querySelector("#add-phone-form")?.addEventListener("submit", (e) => handleAddPhone(e, container));

    const newPhoneInput = container.querySelector("#new-phone-number");
    newPhoneInput?.addEventListener("input", () => {
      newPhoneInput.value = formatPhoneInput(newPhoneInput.value);
    });

    const editPhoneInput = container.querySelector(".phone-edit-input");
    editPhoneInput?.addEventListener("input", () => {
      editPhoneInput.value = formatPhoneInput(editPhoneInput.value);
    });

    container.querySelectorAll('[data-action="edit-phone"]').forEach((btn) =>
      btn.addEventListener("click", () => {
        editingPhoneId = Number(btn.dataset.id);
        onChange();
        container.querySelector(".phone-edit-input")?.focus();
      }),
    );

    container.querySelectorAll('[data-action="cancel-edit-phone"]').forEach((btn) =>
      btn.addEventListener("click", () => {
        editingPhoneId = null;
        onChange();
      }),
    );

    container.querySelectorAll('[data-action="save-phone"]').forEach((btn) =>
      btn.addEventListener("click", () => handleUpdatePhone(Number(btn.dataset.id), container)),
    );

    container.querySelectorAll('[data-action="delete-phone"]').forEach((btn) =>
      btn.addEventListener("click", () => handleDeletePhone(Number(btn.dataset.id))),
    );
  }

  async function load() {
    try {
      phones = await phoneService.getByUser(user.id);
    } catch (err) {
      console.error(err);
      phones = [];
    }
    phonesLoading = false;
    onChange();
  }

  async function handleAddPhone(e, container) {
    e.preventDefault();
    if (phoneBusy) return;

    const input = container.querySelector("#new-phone-number");
    const number = input.value.trim();
    if (!number) return;

    const digits = onlyDigits(number);
    if (phones.some((p) => onlyDigits(p.number) === digits)) {
      showToast("Esse telefone já está cadastrado.", "error");
      return;
    }

    phoneBusy = true;
    onChange();

    try {
      const created = await phoneService.add(user.id, number);
      phones = [...phones, created];
      addingPhone = false;
      showToast("Telefone adicionado!");
    } catch (err) {
      showToast(err.message || "Erro ao adicionar telefone.", "error");
    } finally {
      phoneBusy = false;
      onChange();
    }
  }

  async function handleUpdatePhone(id, container) {
    if (phoneBusy) return;

    const input = container.querySelector(".phone-edit-input");
    const number = input.value.trim();
    if (!number) return;

    const digits = onlyDigits(number);
    if (phones.some((p) => p.id !== id && onlyDigits(p.number) === digits)) {
      showToast("Esse telefone já está cadastrado.", "error");
      return;
    }

    phoneBusy = true;
    onChange();

    try {
      const updated = await phoneService.update(id, number);
      phones = phones.map((p) => (p.id === id ? { ...p, ...updated } : p));
      editingPhoneId = null;
      showToast("Telefone atualizado!");
    } catch (err) {
      showToast(err.message || "Erro ao atualizar telefone.", "error");
    } finally {
      phoneBusy = false;
      onChange();
    }
  }

  async function handleDeletePhone(id) {
    if (phoneBusy) return;

    phoneBusy = true;
    onChange();

    try {
      await phoneService.delete(id);
      phones = phones.filter((p) => p.id !== id);
      showToast("Telefone removido!");
    } catch (err) {
      showToast(err.message || "Erro ao remover telefone.", "error");
    } finally {
      phoneBusy = false;
      onChange();
    }
  }

  return { renderHtml, wireEvents, load };
}

function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function formatPhoneInput(value) {
  const digits = onlyDigits(value).slice(0, 11);
  const len = digits.length;
  if (len === 0) return "";
  if (len <= 2) return `(${digits}`;
  if (len <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (len <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}
