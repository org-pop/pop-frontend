import { authService } from "../services/auth.js";
import { store, normalizeUser } from "../state/store.js";
import { navigate } from "../router.js";
import { syncAccessibilityFromAccount } from "../utils/theme.js";

const STEP_COPY = {
  login: {
    title: "Entre",
    subtitle: "Insira o e-mail e a senha da sua conta POP.",
    button: "Entrar",
  },
  register: {
    title: "Cadastre-se",
    subtitle: "Crie sua conta POP com e-mail e senha.",
    button: "Entrar",
  },
};

export function renderLogin(container, params) {
  const redirectTo = params.query.get("redirect") || "/";
  let step = "login"; // "login" <-> "register", alternável a qualquer momento
  let typedEmail = "";

  function render() {
    const copy = STEP_COPY[step];

    container.innerHTML = `
      <section class="max-w-3xl mx-auto px-6 h-screen flex flex-col justify-center">

        <div class="flex flex-col sm:flex-row sm:items-center gap-6">
          <svg class="w-16 h-16 text-primary shrink-0" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M6.11111 4.88889C6.11111 3.59228 6.62619 2.34877 7.54303 1.43192C8.45988 0.515078 9.70339 0 11 0C12.2966 0 13.5401 0.515078 14.457 1.43192C15.3738 2.34877 15.8889 3.59228 15.8889 4.88889C15.8889 6.1855 15.3738 7.42901 14.457 8.34586C13.5401 9.2627 12.2966 9.77778 11 9.77778C9.70339 9.77778 8.45988 9.2627 7.54303 8.34586C6.62619 7.42901 6.11111 6.1855 6.11111 4.88889ZM6.11111 12.2222C4.49034 12.2222 2.93596 12.8661 1.7899 14.0121C0.643847 15.1582 0 16.7126 0 18.3333C0 19.3058 0.386309 20.2384 1.07394 20.9261C1.76158 21.6137 2.69421 22 3.66667 22H18.3333C19.3058 22 20.2384 21.6137 20.9261 20.9261C21.6137 20.2384 22 19.3058 22 18.3333C22 16.7126 21.3562 15.1582 20.2101 14.0121C19.064 12.8661 17.5097 12.2222 15.8889 12.2222H6.11111Z" fill="currentColor"/>
          </svg>

          <div>
            <h1 class="text-2xl font-bold text-text">${copy.title}</h1>
            <p class="text-sm text-text/60 mt-1">${copy.subtitle}</p>
          </div>

          <form id="auth-form" class="flex-1 flex flex-col gap-3">
            <input type="email" id="email" required placeholder="Insira seu e-mail" value="${typedEmail}" class="border border-secondary rounded-full px-5 py-2.5 bg-surface text-text placeholder:text-text/40 outline-none focus:border-primary transition-colors" />
            ${
              step === "login"
                ? `
              <input type="password" id="password" required placeholder="Insira sua senha" class="border border-secondary rounded-full px-5 py-2.5 bg-surface text-text placeholder:text-text/40 outline-none focus:border-primary transition-colors" />
            `
                : `
              <input type="text" id="name" required placeholder="Seu nome" class="border border-secondary rounded-full px-5 py-2.5 bg-surface text-text placeholder:text-text/40 outline-none focus:border-primary transition-colors" />
              <input type="password" id="password" required minlength="6" placeholder="Insira a nova senha" class="border border-secondary rounded-full px-5 py-2.5 bg-surface text-text placeholder:text-text/40 outline-none focus:border-primary transition-colors" />
              <input type="password" id="password-confirm" required minlength="6" placeholder="Confirme a nova senha" class="border border-secondary rounded-full px-5 py-2.5 bg-surface text-text placeholder:text-text/40 outline-none focus:border-primary transition-colors" />
            `
            }
          </form>
        </div>

        <p id="auth-message" class="text-sm mt-4 hidden"></p>

        <button type="button" id="switch-step" class="text-sm text-primary hover:underline mt-2 text-left">
          ${step === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
        </button>

        <button type="submit" form="auth-form"
                class="w-full bg-primary hover:bg-accent text-white py-3.5 rounded-full mt-10 transition-colors">
          ${copy.button}
        </button>
      </section>
    `;

    container.querySelector("#auth-form").addEventListener("submit", handleSubmit);

    container.querySelector("#switch-step").addEventListener("click", () => {
      // preserva o que já foi digitado no e-mail ao trocar de tela
      typedEmail = container.querySelector("#email").value.trim();
      step = step === "login" ? "register" : "login";
      render();
    });
  }

  function showMessage(text, isError = true) {
    const el = container.querySelector("#auth-message");
    el.textContent = text;
    el.classList.remove("hidden");
    el.classList.toggle("text-red-500", isError);
    el.classList.toggle("text-text/70", !isError);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const email = container.querySelector("#email").value.trim();
    const password = container.querySelector("#password").value;

    if (step === "login") {
      try {
        const result = await authService.login(email, password);
        onAuthSuccess(result);
      } catch (err) {
        // login falhou: pode ser senha errada, mas na dúvida oferecemos o cadastro
        // (o backend não expõe se o e-mail existe sem estar autenticado, de propósito)
        typedEmail = email;
        step = "register";
        render();
        showMessage("Não encontramos essa conta. Complete os dados para criar uma.", false);
      }
      return;
    }

    if (step === "register") {
      const name = container.querySelector("#name").value.trim();
      const passwordConfirm = container.querySelector("#password-confirm").value;

      if (password !== passwordConfirm) {
        showMessage("As senhas não coincidem.");
        return;
      }

      try {
        const result = await authService.register(name, email, password);
        onAuthSuccess(result);
      } catch (err) {
        showMessage(err.message || "Erro ao criar conta.");
      }
      return;
    }
  }

  function onAuthSuccess(result) {
    // O AuthResponse traz `userId`; o resto do app espera `user.id`.
    const user = normalizeUser(result);
    localStorage.setItem("token", result.token);
    localStorage.setItem("user", JSON.stringify(user));
    store.setState({ user });
    syncAccessibilityFromAccount(user.id); // não bloqueia o redirect — aplica assim que voltar
    navigate(redirectTo);
  }

  render();
}
