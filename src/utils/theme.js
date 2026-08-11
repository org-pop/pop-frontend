// Controla preferências de acessibilidade (modo alto contraste + escala de fonte).
// Sempre grava em localStorage (aplica antes do primeiro render, evita flash) e,
// se o usuário estiver logado, também persiste na conta via accessibilityService —
// assim a preferência sincroniza entre dispositivos, não fica só no navegador.

import { accessibilityService } from "../services/acessibility.js";
import { store } from "../state/store.js";

const HC_KEY = "hc-mode";
const FONT_KEY = "font-scale";

// escalas fixas em porcentagem — mais previsível que passo contínuo
const FONT_SCALES = [0.875, 1.0, 1.125, 1.25];
const DEFAULT_SCALE_INDEX = 1; // 100%

// o backend só tem 3 tamanhos (sem "pequeno") — 87.5% e 100% caem os dois em
// "normal" ao salvar; ao sincronizar de volta, "normal" sempre volta como 100%
const SCALE_TO_BACKEND_SIZE = { 0.875: "normal", 1: "normal", 1.125: "large", 1.25: "extra-large" };
const BACKEND_SIZE_TO_SCALE = { normal: 1, large: 1.125, "extra-large": 1.25 };

// -------- alto contraste --------

export function isHighContrast() {
  return localStorage.getItem(HC_KEY) === "1";
}

export function applyHighContrast(enabled, { persist = true } = {}) {
  document.documentElement.classList.toggle("hc", enabled);
  localStorage.setItem(HC_KEY, enabled ? "1" : "0");
  window.dispatchEvent(new CustomEvent("hc-change", { detail: { enabled } }));
  if (persist) persistToAccount();
}

export function toggleHighContrast() {
  applyHighContrast(!isHighContrast());
}

// -------- escala de fonte --------

export function getFontScale() {
  const stored = Number(localStorage.getItem(FONT_KEY));
  const index = FONT_SCALES.indexOf(stored);
  return index === -1 ? FONT_SCALES[DEFAULT_SCALE_INDEX] : stored;
}

export function canIncreaseFontScale() {
  return getFontScale() < FONT_SCALES[FONT_SCALES.length - 1];
}

export function canDecreaseFontScale() {
  return getFontScale() > FONT_SCALES[0];
}

export function applyFontScale(scale, { persist = true } = {}) {
  // muda o font-size do <html> — como Tailwind usa rem, todo o app escala junto
  document.documentElement.style.fontSize = `${scale * 100}%`;
  localStorage.setItem(FONT_KEY, String(scale));
  window.dispatchEvent(new CustomEvent("font-scale-change", { detail: { scale } }));
  if (persist) persistToAccount();
}

export function increaseFontScale() {
  const current = getFontScale();
  const next = FONT_SCALES.find((s) => s > current);
  if (next !== undefined) applyFontScale(next);
}

export function decreaseFontScale() {
  const current = getFontScale();
  const prev = [...FONT_SCALES].reverse().find((s) => s < current);
  if (prev !== undefined) applyFontScale(prev);
}

// -------- sincronização com a conta --------

// salva em segundo plano, sem travar a UI — convidado (sem user) ou backend fora
// do ar não quebram nada, a preferência já está aplicada e salva localmente
function persistToAccount() {
  const { user } = store.getState();
  if (!user) return;
  accessibilityService
    .saveUserSettings(user.id, {
      colorTheme: isHighContrast() ? "high-contrast" : "default",
      fontSizePreference: SCALE_TO_BACKEND_SIZE[getFontScale()] ?? "normal",
    })
    .catch(() => {});
}

// busca as preferências já salvas na conta e aplica localmente — chamar no boot
// (ou logo após o login) só quando já se sabe que existe um usuário logado
export async function syncAccessibilityFromAccount(userId) {
  try {
    const settings = await accessibilityService.getUserSettings(userId);
    if (settings.colorTheme) {
      applyHighContrast(settings.colorTheme === "high-contrast", { persist: false });
    }
    const scale = BACKEND_SIZE_TO_SCALE[settings.fontSizePreference];
    if (scale) applyFontScale(scale, { persist: false });
  } catch {
    // sem conexão ou sem configurações salvas ainda — mantém o que já está local
  }
}

// -------- bootstrap --------

// Chame uma vez no boot da app, antes do initRouter.
export function bootstrapTheme() {
  document.documentElement.classList.toggle("hc", isHighContrast());
  document.documentElement.style.fontSize = `${getFontScale() * 100}%`;
}
