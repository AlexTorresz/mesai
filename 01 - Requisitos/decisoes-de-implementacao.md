# Decisões de implementação e divergências entre documentos

**Ordem de prioridade adotada:** (1) Guia Interativo de Vibe Coding (professor) → (2) Especificação de Requisitos v0.2 → (3) Documentação do Projeto → (4) Manual de Identidade Visual.
Quando os documentos divergem, vale o de maior prioridade. Cada decisão abaixo deve ser **revisada e aprovada pela equipe**.

## Pendências da especificação (seção 6) — como foram resolvidas

| # | Pendência | Decisão implementada | Onde no código |
|---|---|---|---|
| P-01 | Em qual status o Cliente pode cancelar | Somente em **Recebido** (RN-02) | `backend/src/routes/orders.ts` → `POST /orders/:id/cancel` |
| P-02 | Cálculo do frete | **Valor fixo** configurado pelo Gerente, inicial R$ 10,00 (RF-13) | `StoreConfig.deliveryFee`, tela Configurações |
| P-03 | Tempo estimado de chegada | **Tempo fixo** configurável pelo Gerente (padrão 45 min), contado da criação do pedido. API de mapas fica como melhoria. | `StoreConfig.estimatedMinutes` |
| P-04 | Tempo de inatividade | **30 minutos**, verificado no servidor e no navegador | `INACTIVITY_MINUTES`, `middleware/auth.ts`, `AuthContext.tsx` |
| P-05 | Cancelamento pelo Colaborador e onde ficam os cancelados | Qualquer status antes de Entregue, com motivo obrigatório. Os cancelados ficam na aba **Finalizados**. | `adminOrdersRouter` |
| P-06 / RN-12 | Faixa do desconto (0,1–100 × 0–100) | **0,1% a 100%** (RN-12). Campo vazio ou 0 = “sem desconto”. | `routes/dishes.ts` (`discount`) |
| P-07 | Arredondamento | **Por unidade**, meio para cima, 2 casas, antes de multiplicar pela quantidade | `lib/money.ts` |
| P-08 | Rebaixamento de Gerentes | O Gerente seed é **protegido de todos** (inclusive de si mesmo). Gerente comum pode rebaixar outros Gerentes e a si próprio (com confirmação). | `routes/users.ts` |
| P-09 | Trocar senha exige a atual | **Sim** | `PUT /me/password` |

## Divergências entre documentos

| Tema | Manual de Identidade | Especificação v0.2 | Decisão |
|---|---|---|---|
| Perfis | Cliente, ADM, Garçom, Cozinha, Motorista | Cliente, Colaborador, Gerente | **Três perfis da especificação.** Garçom/Cozinha/Motorista ficam no backlog (09 - Melhorias). |
| Confirmação de exclusão | Digitar a palavra `EXCLUIR` | Digitar o **nome do prato** (RF-18) | **Nome do prato** |
| Status do pedido | Pendente, Em Preparo, Pronto, Saiu para Entrega, Entregue | Recebido → Em preparação → Em transporte → Entregue (+ Cancelado) | **Sequência da RN-01** |
| Entrega × Mesa | Opção “Consumo na Mesa” | Apenas delivery | **Apenas delivery** (mesa no backlog) |
| Observações do cliente no pedido | Citadas na visão da Cozinha | Não especificadas | **Não implementado** (backlog) |
| Editar cadastro após link por e-mail | Citado na visão do Cliente | RF-09: edição direta, troca de senha exige a senha atual | **RF-09** |
| Botões laranja com texto branco | Mockups | RNF-06: contraste ≥ 4,5:1 | **Texto escuro (#141415) sobre laranja** (5,71:1). Branco sobre laranja daria 3,22:1 e reprovaria a RNF-06. Ver 03 - Designer System. |
| “Controle financeiro” | Citado na apresentação inicial | Não detalhado em RF | Resumo mínimo do dia para o Gerente (pedidos por status, total recebido em pedidos entregues e ticket médio), ligado ao **problema da seção 1** (“acompanhar o que o restaurante ganha”). Relatórios completos ficam no backlog. |

## Outras decisões técnicas

- **Sessão:** JWT assinado dentro de cookie `httpOnly` + tabela `Session` no banco. Um novo login revoga as sessões anteriores (RF-06). A inatividade é medida pelo `lastActivityAt` da sessão. As consultas automáticas (polling) enviam `X-Mesai-Background: 1` e **não** contam como atividade (RF-07).
- **Atualização sem recarregar (RNF-07):** a tela do pedido e a cesta consultam o servidor a cada **5 s** (limite exigido: 10 s), e o painel da equipe também a cada 5 s.
- **Recuperação de senha (RF-05):** o banco guarda apenas o hash SHA-256 do token. O link vai no fragmento `#token=` da URL e, por isso, não aparece em logs de servidor. O e-mail é entregue pelo Mailpit no ambiente Docker.
- **Endereço de entrega:** a especificação pede CEP + número (+ complemento e referência). O pedido guarda uma **cópia** do endereço no momento da compra.
- **Multiempresa (RNF-10):** as tabelas principais têm `empresaId` (padrão `cantina-67`), sem uso no MVP.
- **Fotos de demonstração:** o seed gera ilustrações vetoriais próprias para os pratos. O Gerente pode substituí-las por fotos reais (upload JPG/PNG/WEBP até 5 MB ou URL).
