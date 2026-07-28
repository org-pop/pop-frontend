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

export const store = createStore({
  user: JSON.parse(localStorage.getItem("user")) || null,
  cart: [],
});
