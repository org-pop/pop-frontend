// Escapa texto antes de interpolar em innerHTML/atributo — sem isso, qualquer
// dado vindo do backend (nome/descrição de produto, nome de usuário) ou da própria
// URL (query de busca) pode injetar HTML/JS (XSS refletido ou armazenado).
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
