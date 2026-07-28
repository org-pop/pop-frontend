const routes = {};
let container = null;

export function registerRoute(path, viewFn, meta = {}) {
  routes[path] = { viewFn, meta };
}

export function initRouter(containerEl) {
  container = containerEl;

  // fires whenever the hash changes (link click, back/forward button, etc.)
  window.addEventListener("hashchange", handleRouteChange);

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
  const [path, queryString] = window.location.pathname.split("?");
  const match = matchRoute(path);

  const header = document.querySelector("nav-header");

  if (!match) {
    container.innerHTML = "<h2>404</h2>";
    return;
  }

  if (meta.requiresAuth && !store.getState().user) {
    navigate("/login");
    return;
  }

  if (header) header.style.display = match.route.meta.hideHeader ? "none" : "";

  const params = new URLSearchParams(window.location.search);
  match.route.viewFn(container, { ...match.params, query: params });
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
