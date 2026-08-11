// Popup pequeno que aparece no topo da tela por alguns segundos e some sozinho.
// Uso: import { showToast } from "../components/toast.js"; showToast("Mensagem aqui");

import { escapeHtml } from "../utils/html.js";

let hideTimeout = null;

export function showToast(message, type = "success") {
  let toast = document.getElementById("app-toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "app-toast";
    document.body.appendChild(toast);
  }

  const palette = {
    success: "bg-primary text-white",
    error: "bg-red-500 text-white",
  };

  toast.className = `fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3.5 rounded-full shadow-lg font-medium text-sm flex items-center gap-2 transition-all duration-300 ${palette[type]}`;
  toast.innerHTML = `
    ${
      type === "success"
        ? `<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`
        : `<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`
    }
    <span>${escapeHtml(message)}</span>
  `;

  // reseta a animação de entrada mesmo se já tiver um toast visível
  toast.style.opacity = "0";
  toast.style.transform = "translate(-50%, -12px)";
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translate(-50%, 0)";
  });

  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translate(-50%, -12px)";
  }, 2800);
}
