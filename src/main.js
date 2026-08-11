import './css/main.css';
import { bootstrapTheme, syncAccessibilityFromAccount } from './utils/theme.js';
import { store } from './state/store.js';
import { cartService } from './services/cart.js';
import { userService } from './services/user.js';
import "./components/nav-header.js";
import "./components/site-footer.js";
import "./components/side-menu.js";
import { initRouter, registerRoute } from './router.js';

bootstrapTheme();

// carrega o cart do backend no boot pra que o badge do header apareça correto
// já no primeiro render — sem isso, o contador só popula quando o user visita /cart
async function bootstrapCart() {
  const { user } = store.getState();
  if (!user) return;
  try {
    const cart = await cartService.get(user.id);
    store.setState({ cart });
  } catch {
    // silencioso — se o backend estiver fora, o resto do app continua funcionando
  }
}
bootstrapCart();

// sessões salvas antes da correção do campo `role` (o AuthResponse do login não
// traz esse campo) ficaram com o user sem role no localStorage — busca uma vez
// no boot pra que o link de admin apareça sem precisar deslogar/logar de novo
async function bootstrapRole() {
  const { user } = store.getState();
  if (!user || user.role) return;
  try {
    const full = await userService.getById(user.id);
    const merged = { ...user, role: full.role };
    localStorage.setItem("user", JSON.stringify(merged));
    store.setState({ user: merged });
  } catch {
    // silencioso — mesmo padrão do bootstrapCart
  }
}
bootstrapRole();

// se a conta já tem alto-contraste/tamanho de fonte salvos (de outro dispositivo,
// por ex.), aplica por cima do que tava em localStorage — só depois do primeiro
// paint (bootstrapTheme já rodou), pra não gerar flash esperando a rede
async function bootstrapAccessibility() {
  const { user } = store.getState();
  if (!user) return;
  await syncAccessibilityFromAccount(user.id);
}
bootstrapAccessibility();
import { renderHome } from './views/home.js';
import { renderLogin } from './views/login.js';
import { renderCatalog } from './views/catalog.js';
import { renderProduct } from './views/product.js';
import { renderCart } from './views/cart.js';
import { renderAddress } from './views/address.js';
import { renderPayment } from './views/payment.js';
import { renderProfile } from './views/profile.js';
import { renderProfileEdit } from './views/profile-edit.js';
import { renderAdminProducts } from './views/admin-products.js';

const app = document.getElementById('app');

registerRoute('/', renderHome);
registerRoute('/login', renderLogin);
registerRoute("/search", renderCatalog);
registerRoute("/catalog", renderCatalog);
registerRoute("/product/:id", renderProduct);
registerRoute("/cart", renderCart, { requiresAuth: true });
registerRoute("/checkout/address", renderAddress, { requiresAuth: true });
registerRoute("/checkout/payment", renderPayment, { requiresAuth: true });
registerRoute("/profile", renderProfile, { requiresAuth: true });
registerRoute("/profile/edit", renderProfileEdit, { requiresAuth: true });
registerRoute("/admin/products", renderAdminProducts, { requiresAuth: true, requiresAdmin: true });

initRouter(app);
