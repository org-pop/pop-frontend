import { store } from "./state/store.js";

const routes = {};
let container = null;

export function registerRoute(path, viewFn, meta = {}) {
  routes[path] = { viewFn, meta };
}

export function initRouter(containerEl) {
  container = containerEl;

  // fires on back/forward button navigation
  window.addEventListener("popstate", handleRouteChange);

  // intercept every internal link click instead of letting the browser navigate
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-link]");
    if (!link) return;
    e.preventDefault();
    navigate(link.getAttribute("href"));
  });

  handleRouteChange(); // initial load
}

export function navigate(path) {
  window.history.pushState({}, "", path);
  handleRouteChange();
}

function handleRouteChange() {
  const [path] = window.location.pathname.split("?");
  const match = matchRoute(path);
  const header = document.querySelector("nav-header");

  if (!match) {
    container.innerHTML = `<section class="min-h-screen flex flex-col justify-center items-center"><h1 class="font-bold text-primary text-8xl">404</h1></section>`;
    if (header) header.style.display = "";
    return;
  }

  const { viewFn, meta } = match.route;

  if (meta.requiresAuth && !store.getState().user) {
    navigate(`/login?redirect=${encodeURIComponent(path)}`);
    return;
  }

  if (header) header.style.display = meta.hideHeader ? "none" : "";

  const params = new URLSearchParams(window.location.search);
  viewFn(container, { ...match.params, query: params });
  playRouteEnter(container);
}

// Re-dispara a animação de entrada da rota. Forçar reflow entre remove/add é
// o padrão que funciona sync — RAF aqui às vezes é engolido pelo batching do browser.
function playRouteEnter(el) {
  el.classList.remove("route-enter");
  void el.offsetWidth; // força reflow — o browser "compromete" o remove antes do add
  el.classList.add("route-enter");
}

function matchRoute(path) {
  const pathSegments = path.split("/").filter(Boolean);
  for (const [routePath, route] of Object.entries(routes)) {
    const routeSegments = routePath.split("/").filter(Boolean);
    if (routeSegments.length !== pathSegments.length) continue;

    const params = {};
    const isMatch = routeSegments.every((seg, i) => {
      if (seg.startsWith(":")) {
        params[seg.slice(1)] = pathSegments[i];
        return true;
      }
      return seg === pathSegments[i];
    });
    if (isMatch) return { route, params };
  }
  return null;
}
