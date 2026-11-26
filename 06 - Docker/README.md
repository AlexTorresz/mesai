# 06 — Docker

| Arquivo | Função |
|---|---|
| `compose.yaml` | Serviços `db` (PostgreSQL 16), `backend` (API), `frontend` (Nginx + React) e `mailpit` (SMTP de teste) |
| `backend.Dockerfile` | Build em 2 estágios; ao iniciar: `prisma migrate deploy` → seed idempotente → API |
| `frontend.Dockerfile` | Build do Vite e Nginx servindo os arquivos, com proxy de `/api` e `/uploads` |
| `.env.example` | Variáveis (senhas, segredo JWT, portas, seed). Copie para `.env`, que **não** vai para o Git |

## Comandos (na raiz do projeto ou nesta pasta)

```bash
docker compose up -d --build   # constrói e sobe
docker compose ps              # status (aguarde "healthy")
docker compose logs -f backend # logs da API
docker compose restart backend # reinicia só a API
docker compose down            # para (mantém os dados)
docker compose down -v         # para e APAGA banco e fotos
```

## Serviços, portas e volumes

| Serviço | Porta no seu PC | Healthcheck | Volume |
|---|---|---|---|
| frontend | `8080` (`APP_PORT`) | `wget /` | — |
| backend | — (acesso via frontend `/api`) | `GET /api/health` (faz `SELECT 1` no banco) | `mesai-uploads` (fotos) |
| db | — | `pg_isready` | `mesai-db` (dados) |
| mailpit | `8025` (`MAILPIT_PORT`) | nativo | — |

Ordem de subida: `db` (healthy) → `backend` (healthy) → `frontend`.

## Verificação registrada

Executado em 25/11/2026: os 4 serviços ficaram *healthy*; um pedido foi criado; após `down` + `up` o pedido continuava lá e o seed não duplicou dados. Evidência: `07 - Testes/evidencias/rnf09-docker-compose.txt`.

> O guia pede que a execução seja repetida **em outro computador ou em instalação limpa** seguindo o README. Registre isso em `07 - Testes/casos-de-teste.md` (CT-41).

## Problemas comuns

| Sintoma | Solução |
|---|---|
| `port is already allocated` (8080 ou 8025) | Mude `APP_PORT` / `MAILPIT_PORT` no `.env` |
| Backend reinicia em loop | `docker compose logs backend`; normalmente é `DATABASE_URL` ou senha do banco alterada depois de criado o volume. Use `docker compose down -v` para recriar. |
| Erro 429 ao baixar imagens | Limite do Docker Hub. Aguarde alguns minutos ou faça `docker login`. |
| Mudou a senha do Gerente no `.env` e não surtiu efeito | O seed só cria o Gerente uma vez. Altere pela tela de perfil ou recrie o banco (`down -v`). |
