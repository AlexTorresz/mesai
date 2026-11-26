# 05 — Desenvolvimento

```
backend/   API REST — Node.js 22 + Express 5 + Prisma 6 + PostgreSQL 16
frontend/  Interface — React 19 + TypeScript + Vite 6 + Tailwind CSS 3
```

## Arquitetura

```
Navegador ──HTTP──▶ Nginx (frontend) ──/api, /uploads──▶ Express (backend) ──Prisma──▶ PostgreSQL
                         │                                   │
                  arquivos do React                    SMTP ──▶ Mailpit (e-mails de teste)
```

- **Regras de negócio só no backend.** O frontend exibe os valores que o servidor calcula (total, desconto, troco) e nunca é a fonte da verdade (RNF-02).
- **Sessão:** cookie `httpOnly` com JWT + tabela `Session` (sessão única e inatividade).
- **Atualização em tempo quase real:** polling a cada 5 s (RNF-07 pede até 10 s).

## Backend (`backend/`)

| Pasta / arquivo | Responsabilidade |
|---|---|
| `prisma/schema.prisma` | Modelo de dados (valores em `Decimal`) |
| `prisma/migrations/` | Migração SQL versionada |
| `prisma/seed.ts` | Gerente padrão, configuração e demonstração (idempotente) |
| `src/app.ts` | Montagem das rotas e permissões por perfil |
| `src/middleware/auth.ts` | Sessão única, inatividade, `requireRole` |
| `src/lib/money.ts` | RN-04 (cálculo do total, arredondamento) |
| `src/lib/cpf.ts` | RF-02 (validação) e máscara (RNF-03) |
| `src/routes/*.ts` | auth, me, config, categories, dishes, cart, orders, users |
| `tests/*.test.ts` | 50 testes (Vitest + Supertest) |

### Endpoints

| Método e rota | Perfil | Requisito |
|---|---|---|
| `POST /api/auth/register` · `login` · `logout` · `GET me` | público / logado | RF-01–04, 06 |
| `POST /api/auth/forgot-password` · `reset-password` | público | RF-05 |
| `PUT /api/me` · `PUT /api/me/password` | logado | RF-09 |
| `GET/PUT /api/config` | logado / Gerente | RF-12, 13 |
| `GET/POST/PUT/DELETE /api/categories` | logado / Gerente | RF-15 |
| `GET /api/dishes` · `POST` · `PUT /:id` · `PATCH /:id/pricing` · `DELETE /:id` | logado / Gerente | RF-14, 16–18 |
| `PATCH /api/dishes/:id/availability` | Colaborador, Gerente | RF-19 |
| `GET /api/unavailability` | Gerente | RF-20 |
| `GET /api/cart` · `POST/PATCH/DELETE /api/cart/items` | logado | RF-21–24 |
| `POST /api/orders` · `GET /mine` · `GET /:id` · `POST /:id/cancel` | logado (dono) | RF-25–29 |
| `GET /api/admin/orders?tab=` · `POST /:id/status` · `POST /:id/cancel` | Colaborador, Gerente | RF-30–32 |
| `GET /api/admin/orders/summary/today` | Gerente | Problema (seção 1) |
| `GET /api/admin/users` · `PATCH /:id/role` | Gerente | RF-10 |

## Frontend (`frontend/src/`)

| Arquivo | Tela |
|---|---|
| `pages/Login.tsx` | Login + cadastro e recuperação sob demanda |
| `pages/ResetPassword.tsx` | Redefinir senha (link do e-mail) |
| `pages/Menu.tsx` | 01 Cardápio & Descontos (+ gestão do Gerente, disponibilidade do Colaborador) |
| `pages/Cart.tsx` | 02 Cesta & Meus Pedidos (pagamento, troco, pedidos ativos, histórico) |
| `pages/OrderDetail.tsx` | Acompanhamento do pedido |
| `pages/Panel.tsx` | 03 Painel & Entregas |
| `pages/Users.tsx` | 04 Tipos de Usuários |
| `pages/Unavailability.tsx` | 05 Indisponibilidades |
| `pages/Profile.tsx` · `pages/Settings.tsx` | Perfil · Configurações |

Para executar fora do Docker, veja o `README.md` da raiz.
