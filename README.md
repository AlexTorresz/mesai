# mesaí — Cantina 67

Sistema web responsivo de **cardápio digital e pedidos** para a Cantina 67 (restaurante italiano familiar).
Projeto da **AV2 de Coding**, organizado conforme o *Guia Interativo de Vibe Coding* do Prof. Me. Bruno Rodrigues.

> **Critério de sucesso da demonstração:** um Cliente cadastrado monta uma cesta e finaliza o pedido. O Colaborador vê o pedido como “Recebido” e o avança até “Entregue”. O Cliente acompanha cada mudança, com o total correto, sem recarregar a página.

---

## Como executar (Docker)

Pré-requisito: [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e aberto.

```bash
# 1. (opcional, recomendado) criar o arquivo de configuração
cp "06 - Docker/.env.example" .env        # depois edite as senhas/segredos

# 2. subir tudo (banco, API, interface e caixa de e-mails de teste)
docker compose up -d --build

# 3. conferir
docker compose ps          # todos devem ficar "healthy"
docker compose logs backend

# 4. parar (os dados continuam salvos nos volumes)
docker compose down
# apagar TUDO, inclusive o banco:  docker compose down -v
```

### Usando as imagens prontas (GitHub Container Registry)

As imagens do backend e do frontend são publicadas automaticamente pelo GitHub Actions a cada push na `main`:

- `ghcr.io/alextorresz/mesai-backend:latest`
- `ghcr.io/alextorresz/mesai-frontend:latest`

Para subir **sem compilar nada** na sua máquina:

```bash
docker compose pull      # baixa as imagens prontas (banco, mailpit, backend e frontend)
docker compose up -d     # sobe usando as imagens baixadas
```

Para usar uma versão específica, defina `MESAI_TAG` no `.env` (ex.: `MESAI_TAG=sha-61ab94c`). O `docker compose up -d --build` continua funcionando e constrói tudo localmente a partir do código.

| Endereço | O quê |
|---|---|
| http://localhost:8080 | **Sistema Mesaí** |
| http://localhost:8025 | Caixa de e-mails de teste (Mailpit): onde chegam os links de “Esqueci minha senha” |

O comando funciona tanto na **raiz do projeto** quanto dentro de `06 - Docker/`. O `compose.yaml` da raiz apenas inclui o de `06 - Docker`.

### Contas de demonstração (criadas pelo seed)

| Perfil | E-mail | Senha |
|---|---|---|
| Gerente padrão (protegido) | `gerente@cantina67.com.br` | `Mesai@2026` |
| Colaborador | `colaborador@cantina67.com.br` | `Mesai@2026` |
| Cliente | `mariana.cliente@gmail.com` | `Mesai@2026` |

> As senhas acima são de demonstração. Troque-as no `.env` (`SEED_GERENTE_PASSWORD`, `SEED_DEMO_PASSWORD`) antes de subir o banco pela primeira vez. Com `SEED_DEMO=false`, apenas o Gerente padrão é criado.

> **Sessão única (RF-06):** cada conta só fica logada em um lugar. Para demonstrar Cliente e Colaborador ao mesmo tempo, use **dois navegadores** (ou uma janela anônima).

---

## Stack

| Camada | Tecnologias |
|---|---|
| Frontend | React 19 + TypeScript, Vite 6, Tailwind CSS 3, React Router 7 |
| Backend | Node.js 22, Express 5, Zod (validação), bcrypt (senhas), JWT em cookie httpOnly |
| Banco | PostgreSQL 16 + Prisma ORM 6 (migrações versionadas) |
| Infra | Docker Compose: `db`, `backend`, `frontend` (Nginx) e `mailpit` (SMTP de teste); imagens publicadas no GHCR via GitHub Actions |
| Testes | Vitest + Supertest (50 testes de API e de regras de negócio) |

---

## Estrutura do repositório

```
mesai/
├── 01 - Requisitos/        especificação v0.2, documentação, decisões e matriz de rastreabilidade
├── 02 - mockup/            manual de identidade (mockups de referência)
├── 03 - Designer System/   tokens, componentes, contraste e acessibilidade
├── 04 - Prompt/            registro do uso de IA, decisões e correções
├── 05 - Desenvolvimento/   backend/ (API) e frontend/ (interface)
├── 06 - Docker/            compose.yaml, Dockerfiles, .env.example
├── 07 - Testes/            casos de teste CT-01 a CT-42 + evidências reais
├── 08 - Deploy/            acesso, roteiro de demonstração e contingência
├── 09 - Melhorias/         backlog, limitações e dívida técnica
├── 10 - Apresentacao/      roteiro dos 18 slides com as evidências disponíveis
├── compose.yaml            atalho para "docker compose up -d --build" na raiz
├── LICENSE                 licença MIT
└── README.md
```

---

## Desenvolvimento sem Docker (opcional)

Requer Node.js 22 e um PostgreSQL acessível.

```bash
# API
cd "05 - Desenvolvimento/backend"
cp .env.example .env              # ajuste DATABASE_URL
npm install
npx prisma migrate deploy
npm run seed
npm run dev                       # http://localhost:3333

# Interface (outro terminal)
cd "05 - Desenvolvimento/frontend"
npm install
npm run dev                       # http://localhost:5173  (encaminha /api para a 3333)

# Testes automatizados da API (usam o banco do DATABASE_URL — use um banco de TESTE)
cd "05 - Desenvolvimento/backend"
npm test
```

---

## Situação da entrega (verificada em 25/11/2026)

- **32/32 requisitos funcionais** implementados. Veja a [matriz de rastreabilidade](01%20-%20Requisitos/matriz-de-rastreabilidade.md).
- **50/50 testes automatizados aprovados** contra PostgreSQL 16 real ([evidência](07%20-%20Testes/evidencias/testes-automatizados-postgres16.txt)).
- `docker compose up -d --build` executado com os 4 serviços *healthy*. Pedido criado, `down`/`up` executado e o pedido continuou salvo ([evidência](07%20-%20Testes/evidencias/rnf09-docker-compose.txt)).
- 16 capturas de tela reais do fluxo completo em [`07 - Testes/evidencias/telas`](07%20-%20Testes/evidencias/telas).

O que **não** foi feito ou ainda depende da equipe está em [`09 - Melhorias`](09%20-%20Melhorias/backlog-e-limitacoes.md) e na coluna “Situação” de [`07 - Testes`](07%20-%20Testes/casos-de-teste.md).

---

## Licença

Distribuído sob a licença MIT. Veja o arquivo [LICENSE](LICENSE).
