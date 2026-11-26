# 08 — Deploy e demonstração

## Ambiente de demonstração (local, via Docker)

1. Abra o Docker Desktop.
2. Na raiz do projeto: `docker compose up -d --build`. A primeira vez leva alguns minutos (download de imagens e dependências).
3. Aguarde `docker compose ps` mostrar os serviços como **healthy**.
4. Acesse **http://localhost:8080**.

Para mostrar o sistema no celular na mesma rede Wi-Fi: `http://<IP-do-computador>:8080` (o IP aparece em `ipconfig` no Windows).

> **Deploy remoto (URL pública):** ainda **não foi feito**. Se a equipe publicar (ex.: VPS com Docker, Render ou Railway), registre aqui a URL, a data e quem fez. Antes, troque `JWT_SECRET`, as senhas do `.env` e use `SEED_DEMO=false` e `COOKIE_SECURE=true` (com HTTPS).

## Roteiro da demonstração (45–60 s, slide 14)

Deixe **dois navegadores** abertos antes de começar (a sessão é única por conta):

| Tempo | Navegador A — Cliente (`mariana.cliente@gmail.com`) | Navegador B — Colaborador (`colaborador@cantina67.com.br`) |
|---|---|---|
| 0–15 s | Cardápio → aba Descontos → Lasanha da Nonna, quantidade 2 → **+ Cesta** | Painel & Entregas aberto (aba Em Produção) |
| 15–30 s | Cesta → Dinheiro → Sim → “150,00” (mostra o troco) → **Finalizar pedido** → tela do pedido em “Recebido” | O pedido aparece sozinho em “Recebido” com o valor a cobrar e o troco |
| 30–50 s | Sem tocar em nada, o status muda na tela | **Aceitar → Em preparação** → **Saiu para entrega** → **Marcar entregue** |
| 50–60 s | Pedido “Entregue”, com o total correto e o histórico com horários | Pedido na aba Finalizados |

Senha das contas de demonstração: `Mesai@2026` (ou a definida no `.env`).

## Contingência

- Grave um vídeo curto do roteiro acima, **com o sistema rodando de verdade**, como plano B (o guia não aceita a gravação como substituta da entrega executável).
- As capturas em `07 - Testes/evidencias/telas/` mostram o mesmo fluxo.
- Se a porta 8080 estiver ocupada no computador da apresentação: `APP_PORT=8090` no `.env`.
- Teste o roteiro no computador da apresentação **no dia anterior**.
