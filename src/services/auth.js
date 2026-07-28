import { api } from "./api.js";

export const authService = {
  register: (name, email, password) =>
    api.post("/api/auth/register", { name, email, password }),

  login: (email, password) => api.post("/api/auth/login", { email, password }),
};
