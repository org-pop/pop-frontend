import { api } from "./api.js";

export const accessibilityService = {
  getLanguages: () => api.get("/api/accessibility/languages"), // public, no token needed
  getUserSettings: (userId) =>
    api.get(`/api/accessibility/users/${userId}/settings`),
  saveUserSettings: (userId, settings) =>
    api.put(`/api/accessibility/users/${userId}/settings`, settings),
  getAdaptedProduct: (productId) =>
    api.get(`/api/accessibility/products/${productId}`),
};
