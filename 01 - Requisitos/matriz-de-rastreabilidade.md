# Matriz de rastreabilidade — Problema → Requisito → Tela → Código → Teste

Atualiza a seção 7 da Especificação v0.2, agora com as colunas **Tela** e **Código** preenchidas.
Caminhos de código relativos a `05 - Desenvolvimento/`. Os testes ficam em `backend/tests/` e o resultado de cada CT está em `07 - Testes/casos-de-teste.md`.

**Problema (seção 1):** a equipe não sabe quantos pedidos chegam, em que estado está cada um, nem quanto o restaurante ganha com eles.

| Req. | Regra | Tela | Código (backend / frontend) | Caso de teste (arquivo) |
|---|---|---|---|---|
| RF-01 | RN-10 | Login → “Criar Novo Cadastro” | `routes/auth.ts` `POST /auth/register` · `pages/Login.tsx` (RegisterForm) | CT-01 (`auth.test.ts`) |
| RF-02 | RN-10 | Cadastro | `lib/cpf.ts` `isValidCpf` | CT-02 (`auth.test.ts`, `unit.test.ts`) |
| RF-03 | RN-10 | Cadastro | `routes/auth.ts` (EMAIL_DUPLICADO / CPF_DUPLICADO) | CT-03 (`auth.test.ts`) |
| RF-04 | — | Login / botão Sair | `POST /auth/login`, `/auth/logout` · `AuthContext.tsx` | CT-04 (`auth.test.ts`) |
| RF-05 | RN-11 | Login → “Esqueci minha senha”; `/redefinir-senha` | `POST /auth/forgot-password`, `/auth/reset-password` · `pages/ResetPassword.tsx` | CT-05 (`auth.test.ts`) |
| RF-06 | RN-06 | Aviso na tela de login | `middleware/auth.ts` (revogação NOVO_LOGIN) | CT-06 (`auth.test.ts`) + tela 16 |
| RF-07 | RN-06 | Aviso na tela de login | `middleware/auth.ts` (INATIVIDADE) · `AuthContext.tsx` (timer) | CT-07 (`auth.test.ts`) |
| RF-08 | RN-07 | Menu por perfil; “Acesso negado” | `requireRole` em `app.ts` · `App.tsx` (Guard) | CT-08 (`admin.test.ts`) |
| RF-09 | RN-10 | Perfil • Nome | `routes/me.ts` · `pages/Profile.tsx` | CT-09 (`auth.test.ts`) |
| RF-10 | RN-07 | 04 Tipos de Usuários | `routes/users.ts` · `pages/Users.tsx` | CT-10 (`admin.test.ts`) |
| RF-11 | RN-07 | — (seed) | `prisma/seed.ts` (`isSeed`) | CT-11 (`admin.test.ts`) |
| RF-12 | — | Configurações | `routes/config.ts` · `pages/Settings.tsx` | CT-12 (`admin.test.ts`) |
| RF-13 | RN-04 | Configurações; Cesta | `StoreConfig.deliveryFee` · `routes/cart.ts` | CT-13 (`admin.test.ts`) |
| RF-14 | — | 01 Cardápio & Descontos | `GET /dishes` · `pages/Menu.tsx` (DishCard) | CT-14 (`admin.test.ts`) |
| RF-15 | — | Cardápio (painel do Gerente) | `routes/categories.ts` · `Menu.tsx` (ManagerPanel) | CT-15 (`admin.test.ts`) |
| RF-16 | — | Cardápio → Novo prato | `POST /dishes` · `Menu.tsx` (DishFormModal) | CT-16 (`admin.test.ts`) |
| RF-17 | RN-12 | Cardápio → Preço / Desconto | `PATCH /dishes/:id/pricing` · `Menu.tsx` (PricingModal) | CT-17 (`admin.test.ts`, `unit.test.ts`) |
| RF-18 | RN-05 | Cardápio → lixeira | `DELETE /dishes/:id` (exclusão lógica) · `Menu.tsx` (DeleteModal) | CT-18 (`admin.test.ts`) |
| RF-19 | RN-09 | Cardápio (Colaborador) | `PATCH /dishes/:id/availability` | CT-19 (`admin.test.ts`) |
| RF-20 | — | 05 Indisponibilidades | `GET /unavailability` · `pages/Unavailability.tsx` | CT-20 (`admin.test.ts`) |
| RF-21 | — | Cardápio (quantidade + Cesta) | `POST /cart/items` · `Menu.tsx` | CT-21 (`orders.test.ts`) |
| RF-22 | — | 02 Cesta | `PATCH/DELETE /cart/items/:id` · `pages/Cart.tsx` | CT-22 (`orders.test.ts`) |
| RF-23 | RN-04 | 02 Cesta | `lib/money.ts` `computeTotals` | CT-23 (`orders.test.ts`, `unit.test.ts`) |
| RF-24 | RN-09 | 02 Cesta (alerta) | `buildCart().canCheckout` · `POST /orders` | CT-24 (`orders.test.ts`) |
| RF-25 | RN-08 | 02 Cesta (pagamento) | `POST /orders` (troco) · `Cart.tsx` | CT-25 (`orders.test.ts`) |
| RF-26 | RN-01, RN-03 | Finalizar pedido | `POST /orders` (OrderItem congelado) | CT-26 (`orders.test.ts`) |
| RF-27 | RN-02 | Cesta / Pedido | `POST /orders/:id/cancel` | CT-27 (`orders.test.ts`) |
| RF-28 | RN-01, RN-02 | `/pedidos/:id` | `GET /orders/:id` · `pages/OrderDetail.tsx` (polling 5 s) | CT-28 (`orders.test.ts`) + telas 05 e 08 |
| RF-29 | — | Cesta → Histórico | `GET /orders/mine` | CT-29 (`orders.test.ts`) |
| RF-30 | RN-01 | 03 Painel & Entregas | `GET /admin/orders?tab=` · `pages/Panel.tsx` | CT-30 (`orders.test.ts`) |
| RF-31 | RN-01 | 03 Painel & Entregas | `POST /admin/orders/:id/status` (`NEXT_STATUS`) | CT-31 (`orders.test.ts`) |
| RF-32 | RN-02 | Painel → Cancelar | `POST /admin/orders/:id/cancel` | CT-32 (`orders.test.ts`) |
| RNF-01 | — | — | `lib/password.ts` (bcrypt) | CT-33 |
| RNF-02 | — | — | `requireRole` (backend) | CT-34 |
| RNF-03 | — | Usuários (CPF mascarado) | `lib/cpf.ts maskCpf`; log sem corpo (`app.ts`) | CT-35 |
| RNF-04 | — | Todas | Tailwind responsivo; menu mobile (`Layout.tsx`) | CT-36 |
| RNF-05 | — | Cardápio / pedidos | — | CT-37 |
| RNF-06 | — | Todas | tokens de contraste (`tailwind.config.js`) | CT-38 |
| RNF-07 | — | Pedido / Painel | `lib/usePolling.ts` | CT-39 |
| RNF-08 | — | — | `Decimal(10,2)` no `schema.prisma`; `lib/money.ts` | CT-40 |
| RNF-09 | — | — | `06 - Docker/compose.yaml` | CT-41 |
| RNF-10 | — | — | `empresaId` no `schema.prisma` | CT-42 |
| Problema (seção 1) | — | Painel (Gerente): resumo do dia | `GET /admin/orders/summary/today` | tela 12 (sem teste automatizado) |
