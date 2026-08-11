function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    getState: () => state,
    setState: (patch) => {
      state = { ...state, ...patch };
      listeners.forEach((listener) => listener(state));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener); // unsubscribe function
    },
  };
}

// O backend retorna `userId` no AuthResponse; o resto do front usa `user.id`.
// Normalizamos aqui e no login para que qualquer sessão (nova ou já persistida
// no localStorage) enxergue ambos os campos e nada quebre em `${user.id}`.
export function normalizeUser(u) {
  if (!u) return null;
  return { ...u, id: u.id ?? u.userId };
}

// aceita "ADMIN", "ROLE_ADMIN" etc. — não sabemos o formato exato que o backend usa
export function isAdmin(user) {
  return String(user?.role ?? "").toUpperCase().includes("ADMIN");
}

export const store = createStore({
  user: normalizeUser(JSON.parse(localStorage.getItem("user"))),
  cart: [],
});
