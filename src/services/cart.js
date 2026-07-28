import { api } from "./api.js";

export const cartService = {
  get: (userId) => api.get(`/cart/${userId}`),
  addItem: (userId, productId, quantity) =>
    api.post(`/cart/${userId}/add/${productId}`, undefined, { quantity }),
  updateQuantity: (userId, itemId, quantity) =>
    api.put(`/cart/${userId}/item/${itemId}`, undefined, { quantity }),
  removeItem: (userId, itemId) => api.delete(`/cart/${userId}/item/${itemId}`),
  clear: (userId) => api.delete(`/cart/${userId}/clear`),
};
