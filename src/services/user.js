import { api } from "./api.js";

export const userService = {
  getAll: () => api.get("api/users"),
  getById: (id) => api.get(`api/users/${id}`),
  getByEmail: (email) => api.get(`api/users/email/${email}`),
  update: (id) => api.put(`/api/users/${id}`),
  delete: (id) => api.delete(`/api/users/${id}`)
};
