import { store } from "../state/store.js";
import { navigate } from "../router.js";
import { userService } from "../services/user.js";
import { phoneService } from "../services/phone.js";
import { addressService } from "../services/adress.js";
import { showToast } from "../components/toast.js";
import { UFS } from "../utils/brazil-states.js";
import { isSameAddress } from "../utils/address-utils.js";

const ICONS = {
  edit: `<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>`,
  trash: `<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>`,
  check: `<path d="M20 6L9 17l-5-5"/>`,
  x: `<path d="M18 6L6 18M6 6l12 12"/>`,
};

export function renderProfileEdit(container) {
  const { user } = store.getState();
  let isSaving = false;

  let phones = [];
  let phonesLoading = true;
  let addingPhone = false;
  let editingPhoneId = null;
  let phoneBusy = false;

  let addresses = [];
  let addressesLoading = true;
  let addingAddress = false;
  let addressBusy = false;

  function render() {
    container.innerHTML = `
      <section class="max-w-2xl mx-auto px-6 py-10 min-h-screen">
        <button id="back-link" class="text-sm text-primary hover:underline mb-6">← Voltar</button>

        <header class="flex items-center gap-4 mb-8">
          <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold shrink-0">
            ${initials(user.name)}
          </div>
          <div class="min-w-0">
            <h1 class="text-xl font-bold text-text truncate">Editar dados</h1>
            <p class="text-sm text-text/60 truncate">${user.email || ""}</p>
          </div>
        </header>

        <form id="profile-form" class="border border-secondary/40 rounded-2xl bg-surface p-6 flex flex-col gap-5">
          ${field("Nome", "name", user.name || "")}
          ${field("E-mail", "email", user.email || "", "email")}

          <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <button type="button" id="cancel-btn"
                    class="border border-secondary/60 text-text hover:bg-secondary/10 px-5 py-2.5 rounded-full transition-colors">
              Cancelar
            </button>
            <button type="submit" id="save-btn" ${isSaving ? "disabled" : ""}
                    class="bg-primary hover:bg-accent disabled:bg-secondary/40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-full transition-colors">
              ${isSaving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>

        <section class="border border-secondary/40 rounded-2xl bg-surface p-6 mt-6 flex flex-col gap-4">
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

          ${renderPhoneBody()}

          ${addingPhone ? phoneForm() : ""}
        </section>

        <section class="border border-secondary/40 rounded-2xl bg-surface p-6 mt-6 flex flex-col gap-4">
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

          ${renderAddressBody()}

          ${addingAddress ? addressForm() : ""}
        </section>
      </section>
    `;

    wireEvents();
  }

  function renderPhoneBody() {
    if (phonesLoading) {
      return `<p class="text-sm text-text/50">Carregando...</p>`;
    }
    if (phones.length === 0) {
      return `<p class="text-sm text-text/50">Nenhum telefone cadastrado.</p>`;
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
          <input type="tel" inputmode="numeric" class="phone-edit-input flex-1 rounded-xl px-4 py-2 border bg-surface border-secondary/60 text-text focus:border-primary outline-none transition-colors"
                 value="${escapeHtml(p.number)}" placeholder="(11) 91234-5678" ${phoneBusy ? "disabled" : ""} />
          <button type="button" data-action="save-phone" data-id="${p.id}" ${phoneBusy ? "disabled" : ""}
                  aria-label="Salvar telefone" class="text-primary hover:text-accent p-1.5 disabled:opacity-50 shrink-0">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${ICONS.check}</svg>
          </button>
          <button type="button" data-action="cancel-edit-phone" ${phoneBusy ? "disabled" : ""}
                  aria-label="Cancelar edição" class="text-text/50 hover:text-text p-1.5 disabled:opacity-50 shrink-0">
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
                  aria-label="Editar telefone" class="text-text/50 hover:text-primary p-1.5 disabled:opacity-50">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.edit}</svg>
          </button>
          <button type="button" data-action="delete-phone" data-id="${p.id}" ${phoneBusy ? "disabled" : ""}
                  aria-label="Excluir telefone" class="text-text/50 hover:text-red-500 p-1.5 disabled:opacity-50">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.trash}</svg>
          </button>
        </div>
      </li>
    `;
  }

  function phoneForm() {
    return `
      <form id="add-phone-form" class="flex items-center gap-2 pt-2 border-t border-secondary/20">
        <input type="tel" inputmode="numeric" id="new-phone-number" required placeholder="(11) 91234-5678" ${phoneBusy ? "disabled" : ""}
               class="flex-1 rounded-xl px-4 py-2 border bg-surface border-secondary/60 text-text focus:border-primary outline-none transition-colors" />
        <button type="submit" ${phoneBusy ? "disabled" : ""}
                class="bg-primary hover:bg-accent disabled:bg-secondary/40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm transition-colors shrink-0">
          Salvar
        </button>
        <button type="button" id="cancel-add-phone" ${phoneBusy ? "disabled" : ""}
                class="text-text/60 hover:text-text px-2 text-sm disabled:opacity-50 shrink-0">
          Cancelar
        </button>
      </form>
    `;
  }

  function renderAddressBody() {
    if (addressesLoading) {
      return `<p class="text-sm text-text/50">Carregando...</p>`;
    }
    if (addresses.length === 0) {
      return `<p class="text-sm text-text/50">Nenhum endereço cadastrado.</p>`;
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
          <span class="text-text/50">CEP ${escapeHtml(a.zipCode)}</span>
        </span>
        <button type="button" data-action="delete-address" data-id="${a.id}" ${addressBusy ? "disabled" : ""}
                aria-label="Excluir endereço" class="text-text/50 hover:text-red-500 p-1.5 disabled:opacity-50 shrink-0">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.trash}</svg>
        </button>
      </li>
    `;
  }

  function addressForm() {
    return `
      <form id="add-address-form" class="flex flex-col gap-3 pt-2 border-t border-secondary/20">
        <div class="grid grid-cols-[1fr_100px] gap-3">
          <input id="new-address-zip" required placeholder="CEP" maxlength="9" ${addressBusy ? "disabled" : ""}
                 class="rounded-xl px-4 py-2 border bg-surface border-secondary/60 text-text placeholder:text-text/40 focus:border-primary outline-none transition-colors" />
          <select id="new-address-state" required ${addressBusy ? "disabled" : ""}
                  class="rounded-xl px-4 py-2 border bg-surface border-secondary/60 text-text focus:border-primary outline-none transition-colors">
            <option value="" disabled selected>UF</option>
            ${UFS.map((uf) => `<option value="${uf}">${uf}</option>`).join("")}
          </select>
        </div>

        <input id="new-address-city" required placeholder="Cidade" ${addressBusy ? "disabled" : ""}
               class="rounded-xl px-4 py-2 border bg-surface border-secondary/60 text-text placeholder:text-text/40 focus:border-primary outline-none transition-colors" />

        <div class="grid grid-cols-[1fr_120px] gap-3">
          <input id="new-address-street" required placeholder="Rua" ${addressBusy ? "disabled" : ""}
                 class="rounded-xl px-4 py-2 border bg-surface border-secondary/60 text-text placeholder:text-text/40 focus:border-primary outline-none transition-colors" />
          <input id="new-address-number" required placeholder="Número" ${addressBusy ? "disabled" : ""}
                 class="rounded-xl px-4 py-2 border bg-surface border-secondary/60 text-text placeholder:text-text/40 focus:border-primary outline-none transition-colors" />
        </div>

        <p id="address-form-feedback" class="text-sm hidden"></p>

        <div class="flex items-center gap-2">
          <button type="submit" ${addressBusy ? "disabled" : ""}
                  class="bg-primary hover:bg-accent disabled:bg-secondary/40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm transition-colors">
            Salvar
          </button>
          <button type="button" id="cancel-add-address" ${addressBusy ? "disabled" : ""}
                  class="text-text/60 hover:text-text px-2 text-sm disabled:opacity-50">
            Cancelar
          </button>
        </div>
      </form>
    `;
  }

  function wireEvents() {
    container.querySelector("#back-link").addEventListener("click", () => navigate("/profile"));
    container.querySelector("#cancel-btn").addEventListener("click", () => navigate("/profile"));
    container.querySelector("#profile-form").addEventListener("submit", handleSave);

    container.querySelector("#add-phone-btn")?.addEventListener("click", () => {
      addingPhone = true;
      render();
      container.querySelector("#new-phone-number")?.focus();
    });

    container.querySelector("#cancel-add-phone")?.addEventListener("click", () => {
      addingPhone = false;
      render();
    });

    container.querySelector("#add-phone-form")?.addEventListener("submit", handleAddPhone);

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
        render();
        container.querySelector(".phone-edit-input")?.focus();
      }),
    );

    container.querySelectorAll('[data-action="cancel-edit-phone"]').forEach((btn) =>
      btn.addEventListener("click", () => {
        editingPhoneId = null;
        render();
      }),
    );

    container.querySelectorAll('[data-action="save-phone"]').forEach((btn) =>
      btn.addEventListener("click", () => handleUpdatePhone(Number(btn.dataset.id))),
    );

    container.querySelectorAll('[data-action="delete-phone"]').forEach((btn) =>
      btn.addEventListener("click", () => handleDeletePhone(Number(btn.dataset.id))),
    );

    container.querySelector("#add-address-btn")?.addEventListener("click", () => {
      addingAddress = true;
      render();
      container.querySelector("#new-address-zip")?.focus();
    });

    container.querySelector("#cancel-add-address")?.addEventListener("click", () => {
      addingAddress = false;
      render();
    });

    container.querySelector("#add-address-form")?.addEventListener("submit", handleAddAddress);

    container.querySelectorAll('[data-action="delete-address"]').forEach((btn) =>
      btn.addEventListener("click", () => handleDeleteAddress(Number(btn.dataset.id))),
    );
  }

  async function loadPhones() {
    try {
      phones = await phoneService.getByUser(user.id);
    } catch (err) {
      console.error(err);
      phones = [];
    }
    phonesLoading = false;
    render();
  }

  async function handleAddPhone(e) {
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
    render();

    try {
      const created = await phoneService.add(user.id, number);
      phones = [...phones, created];
      addingPhone = false;
      showToast("Telefone adicionado!");
    } catch (err) {
      showToast(err.message || "Erro ao adicionar telefone.", "error");
    } finally {
      phoneBusy = false;
      render();
    }
  }

  async function handleUpdatePhone(id) {
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
    render();

    try {
      const updated = await phoneService.update(id, number);
      phones = phones.map((p) => (p.id === id ? { ...p, ...updated } : p));
      editingPhoneId = null;
      showToast("Telefone atualizado!");
    } catch (err) {
      showToast(err.message || "Erro ao atualizar telefone.", "error");
    } finally {
      phoneBusy = false;
      render();
    }
  }

  async function handleDeletePhone(id) {
    if (phoneBusy) return;

    phoneBusy = true;
    render();

    try {
      await phoneService.delete(id);
      phones = phones.filter((p) => p.id !== id);
      showToast("Telefone removido!");
    } catch (err) {
      showToast(err.message || "Erro ao remover telefone.", "error");
    } finally {
      phoneBusy = false;
      render();
    }
  }

  async function loadAddresses() {
    try {
      addresses = await addressService.getByUser(user.id);
    } catch (err) {
      console.error(err);
      addresses = [];
    }
    addressesLoading = false;
    render();
  }

  async function handleAddAddress(e) {
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
    render();

    try {
      const created = await addressService.add(user.id, address);
      addresses = [...addresses, created];
      addingAddress = false;
      showToast("Endereço adicionado!");
    } catch (err) {
      showToast(err.message || "Erro ao adicionar endereço.", "error");
    } finally {
      addressBusy = false;
      render();
    }
  }

  async function handleDeleteAddress(id) {
    if (addressBusy) return;

    addressBusy = true;
    render();

    try {
      await addressService.delete(id);
      addresses = addresses.filter((a) => a.id !== id);
      showToast("Endereço removido!");
    } catch (err) {
      showToast(err.message || "Erro ao remover endereço.", "error");
    } finally {
      addressBusy = false;
      render();
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (isSaving) return;

    const name = container.querySelector("#name").value.trim();
    const email = container.querySelector("#email").value.trim();

    if (!name || !email) {
      showToast("Preencha nome e e-mail.", "error");
      return;
    }

    // nada mudou — não precisa bater no backend
    if (name === user.name && email === user.email) {
      navigate("/profile");
      return;
    }

    isSaving = true;
    render();

    try {
      const updated = await userService.update(user.id, { name, email });
      // preserva o token/campos que o backend não devolve no update
      const merged = { ...user, ...updated, id: updated.id ?? updated.userId ?? user.id };
      localStorage.setItem("user", JSON.stringify(merged));
      store.setState({ user: merged });
      showToast("Perfil atualizado!");
      navigate("/profile");
    } catch (err) {
      showToast(err.message || "Erro ao salvar.", "error");
      isSaving = false;
      render();
    }
  }

  render();
  loadPhones();
  loadAddresses();
}

function field(label, id, value, type = "text") {
  return `
    <div class="flex flex-col gap-1.5">
      <label for="${id}" class="text-xs font-medium text-text/60 uppercase tracking-wide">${label}</label>
      <input type="${type}" id="${id}" name="${id}" value="${escapeHtml(value)}" required
             class="rounded-xl px-4 py-2.5 border bg-surface border-secondary/60 text-text focus:border-primary outline-none transition-colors" />
    </div>
  `;
}

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
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

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
