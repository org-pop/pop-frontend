// Raridades existentes no catálogo. Fonte única usada tanto pelos filtros
// da home quanto pelo select de raridade da tela de administração.
export const RARITIES = [
  { value: "COMUM", label: "Comum" },
  { value: "AURUDO", label: "Aurudo" },
  { value: "GOD", label: "God" },
];

// Produtos "GOD" (Rodolfo e Diogo) ficam sempre fixados no topo de toda
// listagem, independente de filtro/ordenação — item especial permanente,
// não faz parte da rotação normal do catálogo.
const PINNED_RARITY = "GOD";

export function splitPinned(products) {
  const pinned = products.filter((p) => p.rarity === PINNED_RARITY);
  const rest = products.filter((p) => p.rarity !== PINNED_RARITY);
  return { pinned, rest };
}
