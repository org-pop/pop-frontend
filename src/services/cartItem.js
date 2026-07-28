import { api } from "./api.js";

export const cartItemService = {
  create: (cartId, productId, quantity) =>
    api.post("/cart-items", undefined, { cartId, productId, quantity }),
  getByCart: (cartId) => api.get(`/cart-items/cart/${cartId}`),
  updateQuantity: (cartItemId, quantity) =>
    api.put(`/cart-items/${cartItemId}`, undefined, { quantity }),
  delete: (cartItemId) => api.delete(`/cart-items/${cartItemId}`),
  clearCart: (cartId) => api.delete(`/cart-items/cart/${cartId}/clear`),
};
