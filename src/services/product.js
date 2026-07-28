import { api } from "./api.js";

export const productService = {
  getAll: () => api.get("/products"),
  getById: (id) => api.get(`/products/${id}`),
  create: (product) => api.post("/products", product),
  update: (id, product) => api.put(`/products/${id}`, product),
  delete: (id) => api.delete(`/products/${id}`),
  getByFranchise: (franchise) =>
    api.get(`/products/franchise/${encodeURIComponent(franchise)}`),
  getByRarity: (rarity) => api.get(`/products/rarity/${rarity}`),
  getByPriceRange: (min, max) => api.get("/products/price-range", { min, max }),
  lowStock: (threshold) => api.get("/products/low-stock", threshold ? { threshold } : undefined),
  search: (name) => api.get("/products/search", { name }),
  adjustStock: (id, quantity) => api.patch(`/products/${id}/stock`, { quantity }),
};
