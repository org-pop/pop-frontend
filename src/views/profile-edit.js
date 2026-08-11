import { store } from "../state/store.js";
import { navigate } from "../router.js";
import { userService } from "../services/user.js";
import { showToast } from "../components/toast.js";
import { escapeHtml } from "../utils/html.js";
import { createPhoneSection } from "./profile-edit/phone-section.js";
import { createAddressSection } from "./profile-edit/address-section.js";

export function renderProfileEdit(container) {
  const { user } = store.getState();
  let isSaving = false;

  const phoneSection = createPhoneSection(user, render);
  const addressSection = createAddressSection(user, render);

  function render() {
    container.innerHTML = `
      <section class="max-w-2xl mx-auto px-6 py-10 min-h-screen">
        <button id="back-link" class="text-sm text-primary hover:underline mb-6">← Voltar</button>

        <header class="flex items-center gap-4 mb-8">
          <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold shrink-0">
            ${escapeHtml(initials(user.name))}
          </div>
          <div class="min-w-0">
            <h1 class="text-xl font-bold text-text truncate">Editar dados</h1>
            <p class="text-sm text-text/70 truncate">${escapeHtml(user.email)}</p>
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
          ${phoneSection.renderHtml()}
        </section>

        <section class="border border-secondary/40 rounded-2xl bg-surface p-6 mt-6 flex flex-col gap-4">
          ${addressSection.renderHtml()}
        </section>
      </section>
    `;

    wireEvents();
    phoneSection.wireEvents(container);
    addressSection.wireEvents(container);
  }

  function wireEvents() {
    container.querySelector("#back-link").addEventListener("click", () => navigate("/profile"));
    container.querySelector("#cancel-btn").addEventListener("click", () => navigate("/profile"));
    container.querySelector("#profile-form").addEventListener("submit", handleSave);
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
  phoneSection.load();
  addressSection.load();
}

function field(label, id, value, type = "text") {
  return `
    <div class="flex flex-col gap-1.5">
      <label for="${id}" class="text-xs font-medium text-text/70 uppercase tracking-wide">${label}</label>
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
