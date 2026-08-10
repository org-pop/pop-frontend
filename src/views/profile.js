import { store } from "../state/store.js";
import { navigate } from "../router.js";
import { userService } from "../services/user.js";
import { showToast } from "../components/toast.js";

export function renderProfile(container) {
  const { user } = store.getState();

  let isEditing = false;
  let isSaving = false;

  function render() {
    container.innerHTML = `
      <section class="max-w-2xl mx-auto px-6 py-10 pt-28 min-h-screen">

        <header class="flex items-center gap-4 mb-8">
          <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold shrink-0">
            ${initials(user.name)}
          </div>
          <div class="min-w-0">
            <h1 class="text-2xl font-bold text-text truncate">${user.name || "Minha conta"}</h1>
            <p class="text-sm text-text/60 truncate">${user.email || ""}</p>
          </div>
        </header>

        <form id="profile-form" class="border border-secondary/40 rounded-2xl bg-surface p-6 flex flex-col gap-5">
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-primary">Dados pessoais</p>
            ${
              !isEditing
                ? `<button type="button" id="edit-btn" class="text-sm text-primary hover:underline">Editar</button>`
                : ""
            }
          </div>

          ${field("Nome", "name", user.name || "", isEditing)}
          ${field("E-mail", "email", user.email || "", isEditing, "email")}

          ${
            isEditing
              ? `
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
            `
              : ""
          }
        </form>

        <nav aria-label="Atalhos da conta" class="flex flex-col sm:flex-row gap-3 mt-6">
          <a href="/cart" data-link
             class="flex-1 text-center border border-primary text-primary hover:bg-primary/5 py-3 rounded-full transition-colors">
            Meu carrinho
          </a>
          <button type="button" id="logout-btn"
                  class="flex-1 bg-primary hover:bg-accent text-white py-3 rounded-full transition-colors">
            Sair da conta
          </button>
        </nav>
      </section>
    `;

    wireEvents();
  }

  function wireEvents() {
    container.querySelector("#logout-btn").addEventListener("click", logout);

    const editBtn = container.querySelector("#edit-btn");
    editBtn?.addEventListener("click", () => {
      isEditing = true;
      render();
      container.querySelector("#name")?.focus();
    });

    const cancelBtn = container.querySelector("#cancel-btn");
    cancelBtn?.addEventListener("click", () => {
      isEditing = false;
      render();
    });

    const form = container.querySelector("#profile-form");
    form.addEventListener("submit", handleSave);
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
      isEditing = false;
      render();
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
      Object.assign(user, merged); // atualiza a referência local pro próximo render
      isEditing = false;
      showToast("Perfil atualizado!");
    } catch (err) {
      showToast(err.message || "Erro ao salvar.", "error");
    } finally {
      isSaving = false;
      render();
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    store.setState({ user: null, cart: [] });
    navigate("/");
  }

  render();
}

function field(label, id, value, editable, type = "text") {
  return `
    <div class="flex flex-col gap-1.5">
      <label for="${id}" class="text-xs font-medium text-text/60 uppercase tracking-wide">${label}</label>
      <input type="${type}" id="${id}" name="${id}" value="${escapeHtml(value)}" ${editable ? "required" : "readonly"}
             class="rounded-xl px-4 py-2.5 border transition-colors outline-none
                    ${editable
                      ? "bg-surface border-secondary/60 text-text focus:border-primary"
                      : "bg-bg border-transparent text-text/80 cursor-default"}" />
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

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
