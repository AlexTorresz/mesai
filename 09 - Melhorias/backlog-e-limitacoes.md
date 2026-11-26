# 09 — Backlog, limitações e dívida técnica

## Limitações conhecidas (o que NÃO está no sistema)

| Item | Origem | Situação |
|---|---|---|
| Perfis Garçom, Cozinha e Motorista | Manual (p. 10) | Agrupados em “Colaborador”, como na especificação v0.2 |
| Consumo na mesa | Manual (p. 8–10) | Só delivery |
| Observações do cliente por item (“ponto da carne”) | Manual (visão Cozinha) | Não implementado |
| Cálculo de distância e rota por API de mapas | Manual (p. 8, 10); Doc. 16.2 | Tempo estimado fixo e configurável |
| Relatórios financeiros (período, mais vendidos, fluxo de caixa) | Doc. 16.1 | Só o resumo do dia (pedidos, entregues, total recebido, ticket médio) |
| Confirmação de recebimento do pagamento presencial | Doc. 16.1 | Não registrada separadamente; “Entregue” implica pagamento recebido |
| Notificações (push, e-mail, WhatsApp) de mudança de status | Doc. 16.2 | Só atualização na tela (polling de 5 s) |
| Deploy público com HTTPS | Guia, Etapa 07 | Apenas local via Docker |
| Teste com usuário real | Guia, Etapa 03 | **Pendente pela equipe** |

## Três melhorias priorizadas (slide 16)

| # | Melhoria | Tipo | Valor | Esforço | Risco |
|---|---|---|---|---|---|
| 1 | **Perfis Cozinha e Motorista** com painéis filtrados (cozinha vê Recebido/Em preparação; motorista vê Em transporte) e permissões por etapa | Funcionalidade futura | Alto (reflete a operação real) | Médio | Baixo: as regras de status já estão no backend |
| 2 | **Tempo estimado por distância** (CEP do cliente → API de mapas) e taxa de entrega por faixa de km | Funcionalidade futura | Alto (previsão mais confiável) | Médio | Médio: depende de API externa e custo |
| 3 | **Relatórios do Gerente** por período: faturamento, pratos mais vendidos, cancelamentos por motivo | Funcionalidade futura | Alto (responde ao problema da seção 1) | Baixo/Médio: os dados já são congelados por pedido | Baixo |

## Melhorias de UX

- Observações por item e “consumo na mesa” (manual).
- Busca por nome no cardápio.
- Som ou alerta visual no painel quando chega pedido novo.
- Modo offline / PWA para o painel da cozinha.

## Dívida técnica

| Item | Por que importa |
|---|---|
| Polling em vez de WebSocket/SSE | Funciona e atende a RNF-07, mas gera requisições constantes; SSE reduziria carga e atraso |
| Testes de interface (E2E) não automatizados | As telas foram verificadas por navegação automatizada pontual, não por uma suíte (ex.: Playwright) no CI |
| Sem pipeline de CI (GitHub Actions) | Os testes não rodam a cada commit |
| Sem limitação de tentativas de login (rate limit) | Recomendado contra força bruta |
| Fotos enviadas ficam em volume local | Para produção, usar armazenamento de objetos (S3 ou similar) |
| Seed de demonstração com senhas conhecidas | Usar `SEED_DEMO=false` fora da apresentação |
