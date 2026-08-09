import './css/main.css';
import "./components/nav-header.js";
import "./components/site-footer.js";
import { initRouter, registerRoute } from './router.js';
import { renderHome } from './views/home.js';
import { renderLogin } from './views/login.js';
import { renderCatalog } from './views/catalog.js';
import { renderProduct } from './views/product.js';
import { renderCart } from './views/cart.js';
import { renderAddress } from './views/address.js';
import { renderPayment } from './views/payment.js';
import { renderCheckout } from './views/checkout.js';
import { renderProfile } from './views/profile.js';

const app = document.getElementById('app');

registerRoute('/', renderHome);
registerRoute('/login', renderLogin);
registerRoute("/search", renderCatalog);
registerRoute("/catalog", renderCatalog);
registerRoute("/product/:id", renderProduct);
registerRoute("/cart", renderCart, { requiresAuth: true });
registerRoute("/checkout/address", renderAddress, { requiresAuth: true });
registerRoute("/checkout/payment", renderPayment, { requiresAuth: true });
registerRoute("/checkout", renderCheckout, { requiresAuth: true });
registerRoute("/profile", renderProfile, { requiresAuth: true });

initRouter(app);
