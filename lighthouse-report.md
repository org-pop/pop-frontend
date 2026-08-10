# Relatório de Acessibilidade — Lighthouse

Evidência exigida pela Seção 5.2 do enunciado. **Os números abaixo ainda precisam
ser preenchidos com execuções reais** — nenhum valor aqui foi estimado.

## Protocolo seguido

1. Chrome em janela anônima, sem extensões ativas.
2. Categoria selecionada: **apenas Acessibilidade**.
3. Dispositivo: **Desktop**.
4. Três execuções consecutivas por página; considera-se a **mediana**.
5. Páginas auditadas: **home (`/`)** e **checkout (`/checkout`)**.

Para reproduzir: suba a API, rode o front (`npm run dev`), abra o Chrome anônimo
em `http://localhost:5173`, F12 › Lighthouse › Accessibility › Desktop › Analyze.

> O checkout exige sessão. Faça login antes de auditar, senão a rota redireciona
> para `/login` e o relatório mede a página errada.

## Resultados

### Página principal — `/`

| Execução | Data | Score |
|:---------|:-----|------:|
| 1        |      |       |
| 2        |      |       |
| 3        |      |       |
| **Mediana** | — |    |

### Página interna — `/checkout`

| Execução | Data | Score |
|:---------|:-----|------:|
| 1        |      |       |
| 2        |      |       |
| 3        |      |       |
| **Mediana** | — |    |

## Capturas

Salvar os três print-screens de cada página em `docs/lighthouse/` e referenciar aqui.

## Checklist da Seção 5 — situação verificada no código

| # | Critério | Situação | Onde |
|:--|:---------|:---------|:-----|
| 1 | `alt` descritivo; decorativas com `alt=""` | Atendido | `product-card.js`, `product.js` usam `imageAltText`; miniaturas de carrinho e resumo são decorativas |
| 2 | Contraste ≥ 4.5:1 | Atendido — menor par medido: **5.16:1** | tokens `--color-muted` / `--color-danger` em `main.css` |
| 3 | Navegação completa por teclado | Skip link e ordem de tabulação verificados; **falta validar carrinho e checkout logados** | `index.html`, `main.css` |
| 4 | Foco visível | Atendido — `:focus-visible` com contorno de 3px | `main.css` |
| 5 | HTML semântico | Atendido — `header`/`main`/`footer`/`nav`/`fieldset`; um `h1` por rota | todas as views |
| 6 | Labels associados e erros acessíveis | Atendido — todo campo tem `<label for>`; erros com `role="alert"` e `aria-invalid` | `login.js`, `checkout.js`, `search-bar.js` |
| 7 | Nada transmitido só por cor | Atendido — erros sempre acompanham texto | `checkout.js` |
| 8 | Zoom 200% sem quebra | **A verificar em sala** (Ctrl + scroll) | — |
| 9 | `lang="pt-BR"` | Atendido | `index.html` |
| 10 | Lighthouse ≥ 90 | **A medir** | este arquivo |
