// Controla preferências de acessibilidade (modo alto contraste + escala de fonte)
// e persiste em localStorage. Deve ser aplicado antes do primeiro render para
// evitar flash com a paleta/tamanho padrão em quem já escolheu outro.

const HC_KEY = "hc-mode";
const FONT_KEY = "font-scale";

// escalas fixas em porcentagem — mais previsível que passo contínuo
const FONT_SCALES = [0.875, 1.0, 1.125, 1.25];
const DEFAULT_SCALE_INDEX = 1; // 100%

// -------- alto contraste --------

export function isHighContrast() {
  return localStorage.getItem(HC_KEY) === "1";
}

export function applyHighContrast(enabled) {
  document.documentElement.classList.toggle("hc", enabled);
  localStorage.setItem(HC_KEY, enabled ? "1" : "0");
  window.dispatchEvent(new CustomEvent("hc-change", { detail: { enabled } }));
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

function applyFontScale(scale) {
  // muda o font-size do <html> — como Tailwind usa rem, todo o app escala junto
  document.documentElement.style.fontSize = `${scale * 100}%`;
  localStorage.setItem(FONT_KEY, String(scale));
  window.dispatchEvent(new CustomEvent("font-scale-change", { detail: { scale } }));
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

// -------- bootstrap --------

// Chame uma vez no boot da app, antes do initRouter.
export function bootstrapTheme() {
  document.documentElement.classList.toggle("hc", isHighContrast());
  document.documentElement.style.fontSize = `${getFontScale() * 100}%`;
}
