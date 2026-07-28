import './css/main.css';
import "./components/nav-header.js";
import { initRouter, registerRoute } from './router.js';
import { renderHome } from './views/home.js';
// import { renderProductDetail } from './views/productDetail.js';
// import { renderLogin } from './views/login.js';
// import { renderCart } from './views/cart.js';
// import { renderCheckout } from './views/checkout.js';

const app = document.getElementById('app');

registerRoute('/', renderHome);

initRouter(app);
