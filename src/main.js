import './css/main.css';
import "./components/nav-header.js";
import "./components/site-footer.js";
import { initRouter, registerRoute } from './router.js';
import { renderHome } from './views/home.js';
import { renderLogin } from './views/login.js';
import { renderCatalog } from './views/catalog.js';
import { renderProduct } from './views/product.js';
import { renderCart } from './views/cart.js';

const app = document.getElementById('app');

registerRoute('/', renderHome);
registerRoute('/login', renderLogin);
registerRoute("/search", renderCatalog);
registerRoute("/catalog", renderCatalog);
registerRoute("/product/:id", renderProduct);
registerRoute("/cart", renderCart, { requiresAuth: true })

initRouter(app);

console.log(import.meta.env.API_KEY)
