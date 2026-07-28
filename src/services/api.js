const API_KEY = import.meta.env.API_KEY;

async function request(endpoint, { method = "GET", body, params } = {}) {
  const token = localStorage.getItem("token");

  let url = `${API_KEY}${endpoint}`;
  if (params) {
    const query = new URLSearchParams(params).toString();
    url += `?${query}`;
  }

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `Erro ${res.status}`);
  }

  return res.status === 204 ? null : res.json();
}

export const api = {
  get: (endpoint, params) => request(endpoint, { params }),
  post: (endpoint, body, params) =>
    request(endpoint, { method: "POST", body, params }),
  put: (endpoint, body, params) =>
    request(endpoint, { method: "PUT", body, params }),
  patch: (endpoint, params) => request(endpoint, { method: "PATCH", params }),
  delete: (endpoint) => request(endpoint, { method: "DELETE" }),
};
