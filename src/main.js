import './css/main.css';
import "./components/nav-header.js";
import "./components/site-footer.js";
import { initRouter, registerRoute } from './router.js';
import { renderHome } from './views/home.js';
import { renderLogin } from './views/login.js';
import { renderCatalog } from './views/catalog.js';
// import { renderProductDetail } from './views/productDetail.js';
// import { renderCart } from './views/cart.js';
// import { renderCheckout } from './views/checkout.js';

const app = document.getElementById('app');

registerRoute('/', renderHome);
registerRoute('/login', renderLogin);
registerRoute('/catalog', renderCatalog);

initRouter(app);
