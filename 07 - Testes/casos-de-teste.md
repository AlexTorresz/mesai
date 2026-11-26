# Casos de teste — CT-01 a CT-42

**Execução registrada:** 25/11/2026, por Claude (assistente de IA), no ambiente de desenvolvimento descrito abaixo.
**Ambiente:** Docker Engine 29 · PostgreSQL 16 (container `db`) · Node.js 22 · Chrome headless para as capturas.
**Como reexecutar:** `cd "05 - Desenvolvimento/backend" && npm test`, com `DATABASE_URL` apontando para um banco **de teste**.

> Conforme o guia do professor, um teste só conta como executado quando existe registro real do resultado. Os resultados abaixo têm evidência anexada.
> **A equipe deve reexecutar os testes na própria máquina e registrar a data e o responsável** (coluna “Reexecução pela equipe”).

**Legenda de situação:** ✅ Aprovado · ⚠️ Parcial (parte verificada, restante indicado) · ⏳ Não executado

## Evidências

| Arquivo | Conteúdo |
|---|---|
| `evidencias/testes-automatizados-postgres16.txt` | Saída do Vitest: **50 testes, 50 aprovados**, contra PostgreSQL 16 real |
| `evidencias/rnf09-docker-compose.txt` | `docker compose ps` após `up -d --build` e após `down` + `up`; logs da migração e do seed |
| `evidencias/rnf05-desempenho.txt` | Tempos de resposta medidos (pior caso: 0,03 s) |
| `evidencias/rnf03-logs-sem-dados-pessoais.txt` | Busca por CPF, e-mail e senha nos logs (0 ocorrências) |
| `evidencias/telas/*.png` | 16 capturas do fluxo real (desktop 1366 px e celular 360 px) |

## Requisitos funcionais

Os passos detalhados de cada caso estão no código do teste (arquivo indicado). Pré-condição comum: banco migrado e seed executado (Gerente padrão + cardápio de demonstração).

| CT | Req. | Pré-condição | Passos / entrada | Resultado esperado | Resultado obtido | Evidência | Situação | Reexecução pela equipe |
|---|---|---|---|---|---|---|---|---|
| CT-01 | RF-01 | — | Cadastrar com todos os obrigatórios (opcionais vazios); repetir removendo cada obrigatório (nome, telefone, e-mail, senha, CPF, CEP, número) | 201 e perfil Cliente; cada omissão → 400 com mensagem | Conforme esperado (8 verificações) | `auth.test.ts`; tela 02 | ✅ | |
| CT-02 | RF-02 | — | CPF `111.111.111-11`, `529.982.247-24` (DV errado), CPF válido | Inválidos recusados (`CPF_INVALIDO`); válido aceito | Conforme esperado | `auth.test.ts`, `unit.test.ts` | ✅ | |
| CT-03 | RF-03 | Usuário já cadastrado | Novo cadastro com o mesmo e-mail (em maiúsculas) e outro com o mesmo CPF | 409 `EMAIL_DUPLICADO` / `CPF_DUPLICADO` | Conforme esperado | `auth.test.ts` | ✅ | |
| CT-04 | RF-04 | Usuário cadastrado | Login por e-mail e por CPF; senha errada; e-mail inexistente; logout | Sessão aberta; erro com **mesma mensagem** nos dois casos; após logout → 401 | Conforme esperado | `auth.test.ts`; tela 01 | ✅ | |
| CT-05 | RF-05 | Usuário cadastrado | Pedir link → redefinir → reutilizar o link; link com validade vencida; e-mail inexistente | 1º uso ok; reuso `LINK_USADO`; vencido `LINK_EXPIRADO`; resposta genérica | Conforme esperado. No Docker, o e-mail chegou ao Mailpit. | `auth.test.ts`; `rnf09-docker-compose.txt` | ✅ | |
| CT-06 | RF-06 | Usuário cadastrado | Logar no agente A, depois no agente B, e repetir uma ação em A | A recebe 401 `SESSAO_SUBSTITUIDA`; B segue logado | Conforme esperado; aviso exibido na tela de login | `auth.test.ts`; tela 16 | ✅ | |
| CT-07 | RF-07 | Sessão aberta | Simular 31 min sem atividade; polling com `X-Mesai-Background` | Próxima ação → 401 `SESSAO_EXPIRADA`; polling não renova a sessão | Conforme esperado | `auth.test.ts` | ✅ | |
| CT-08 | RF-08 | Cliente e Colaborador logados | Chamar diretamente rotas do Gerente (`/admin/users`, `PUT /config`, `POST /categories`, `POST /dishes`, `/unavailability`) | 403 em todas; sem login → 401 | Conforme esperado | `admin.test.ts` | ✅ | |
| CT-09 | RF-09 | Cliente logado | Editar dados; tentar e-mail de outro usuário; enviar `cpf`; trocar senha com a atual errada e depois correta | Salva; `EMAIL_DUPLICADO`; CPF recusado (400); `SENHA_ATUAL_INCORRETA`; troca ok | Conforme esperado | `auth.test.ts` | ✅ | |
| CT-10 | RF-10 | Gerente e Cliente logados | Promover Cliente → Colaborador → Cliente | Novo perfil vale na próxima requisição | Conforme esperado | `admin.test.ts`; tela 11 | ✅ | |
| CT-11 | RF-11 | Banco recém-criado | Contar Gerentes seed; logar; Gerente comum e o próprio seed tentam rebaixá-lo | Exatamente 1; login ok; 403 nas duas tentativas | Conforme esperado (também no Docker: `gerentes_seed = 1`) | `admin.test.ts` | ✅ | |
| CT-12 | RF-12 | Gerente logado | Salvar endereço | Salvo e exibido como origem do pedido | Conforme esperado | `admin.test.ts`; tela 08 (Origem) | ✅ | |
| CT-13 | RF-13 | Gerente logado | Alterar taxa para R$ 7,50 e voltar para R$ 10,00 | Cesta mostra o novo valor e o usa no total | Conforme esperado | `admin.test.ts`; tela 04 | ✅ | |
| CT-14 | RF-14 | Cardápio com desconto | Listar como Cliente | Pratos por categoria, com nome, descrição, valor e foto; original riscado + valor com desconto | Conforme esperado | `admin.test.ts`; tela 03 | ✅ | |
| CT-15 | RF-15 | Gerente logado | Criar, duplicar, renomear e remover categoria | Criada e listada; duplicada → 409; renomeada; removida | Conforme esperado | `admin.test.ts`; tela 09 | ✅ | |
| CT-16 | RF-16 | Gerente logado | Criar prato sem cada um de nome, descrição, valor e foto | 400 em todos | Conforme esperado | `admin.test.ts` | ✅ | |
| CT-17 | RF-17 | Prato existente | Valor R$ 36,00 + 15%; descontos 0,05% e 101% | Final R$ 30,60; fora de 0,1–100 → 400 | Conforme esperado | `admin.test.ts`; tela 10 | ✅ | |
| CT-18 | RF-18 | Prato em um pedido antigo | Excluir digitando `EXCLUIR` e depois o nome correto | 1ª recusada; 2ª some do cardápio e o pedido antigo mantém o item | Conforme esperado | `admin.test.ts` | ✅ | |
| CT-19 | RF-19 | Colaborador logado | Marcar indisponível; Cliente tenta adicionar; Cliente tenta mudar a disponibilidade | 409 `PRATO_INDISPONIVEL`; Cliente → 403 | Conforme esperado | `admin.test.ts` | ✅ | |
| CT-20 | RF-20 | Marcação feita | Abrir painel de indisponibilidades | Registro com prato, Colaborador e data/hora | Conforme esperado | `admin.test.ts` | ✅ | |
| CT-21 | RF-21 | Cliente logado | Adicionar 2× prato A e 3× prato B | Coexistem; subtotal R$ 35,00 | Conforme esperado | `orders.test.ts`; tela 04 | ✅ | |
| CT-22 | RF-22 | Cesta com itens | Quantidade 0; reduzir para 1; excluir item | 0 recusado; total atualizado; item removido | Conforme esperado | `orders.test.ts` | ✅ | |
| CT-23 | RF-23 | Frete R$ 10,00 | 3× R$ 10,00 (15%) + 2× R$ 33,33 (33,3%) + 1× R$ 19,99 | Itens R$ 89,95; total **R$ 99,95** | Conforme esperado | `orders.test.ts`, `unit.test.ts` | ✅ | |
| CT-24 | RF-24 | Cesta com 2 pratos | Tornar 1 indisponível; tentar finalizar; remover; finalizar | Aviso com o nome; 409; após remoção → 201 | Conforme esperado | `orders.test.ts` | ✅ | |
| CT-25 | RF-25 | Total R$ 50,00 | Dinheiro com R$ 49,99 / 50,00 / 100,00 | Recusado / troco 0,00 / troco 50,00 | Conforme esperado | `orders.test.ts`; tela 04 | ✅ | |
| CT-26 | RF-26 | Cesta com itens | Finalizar; alterar preço do prato para R$ 99,00 com 50% | Nasce Recebido; cesta vazia; pedido mantém R$ 20,00 | Conforme esperado | `orders.test.ts`; tela 05 | ✅ | |
| CT-27 | RF-27 | Pedido do Cliente | Cancelar em Recebido; outro pedido já em preparação | Cancelado; 409 `CANCELAMENTO_NEGADO` | Conforme esperado | `orders.test.ts` | ✅ | |
| CT-28 | RF-28 | Pedido em andamento | Colaborador avança; Cliente consulta (polling) | Cliente vê o novo status e o histórico com horários | Conforme esperado; na tela, a mudança apareceu sem recarregar | `orders.test.ts`; telas 05 → 08 | ✅ | |
| CT-29 | RF-29 | 2 Clientes com pedidos | Cliente 1 lista os seus e tenta abrir o pedido do Cliente 2 | Só os próprios; pedido alheio → 404 | Conforme esperado | `orders.test.ts` | ✅ | |
| CT-30 | RF-30 | Pedidos variados | Listar abas antes e depois de Entregue | Entregue e Cancelado só em Finalizados | Conforme esperado | `orders.test.ts`; telas 06, 07 | ✅ | |
| CT-31 | RF-31 | Pedido Recebido | Pular para Em transporte; avançar; voltar para Recebido; avançar após Entregue | Pulo/retorno `TRANSICAO_INVALIDA`; final `STATUS_FINAL` | Conforme esperado | `orders.test.ts` | ✅ | |
| CT-32 | RF-32 | Pedido em preparação | Cancelar sem motivo, com espaços e com “Falta de ingrediente” | 400, 400, Cancelado; motivo visível ao Cliente e ao Gerente | Conforme esperado | `orders.test.ts` | ✅ | |

## Requisitos não funcionais

| CT | RNF | Como foi verificado | Resultado obtido | Evidência | Situação | Reexecução pela equipe |
|---|---|---|---|---|---|---|
| CT-33 | RNF-01 Senhas com hash e salt | Teste automatizado + consulta ao banco | Hash bcrypt `$2b$10$…`, sem senha em texto | `auth.test.ts`; `rnf09-docker-compose.txt` | ✅ | |
| CT-34 | RNF-02 Autorização no backend | Chamadas diretas às rotas com perfil insuficiente | 403/401 em todas | `admin.test.ts` (CT-08) | ✅ | |
| CT-35 | RNF-03 Privacidade (LGPD) | Busca por CPF/e-mail/senha nos logs; CPF mascarado na lista de usuários | 0 ocorrências; CPF `***.533.***-**` | `rnf03-logs-sem-dados-pessoais.txt`; tela 11 | ✅ | |
| CT-36 | RNF-04 Responsividade | Capturas a 360 px (cardápio e pedido) e a 1366 px | Usável nas telas capturadas | telas 14, 15 | ⚠️ Parcial: **painel, usuários e perfil a 360 px não foram capturados** | |
| CT-37 | RNF-05 Desempenho ≤ 2 s | 10 medições do cardápio, 5 de cesta e 5 de pedido, via Nginx | Pior caso 0,03 s | `rnf05-desempenho.txt` | ✅ | |
| CT-38 | RNF-06 Contraste ≥ 4,5:1 / poucos passos | Cálculo WCAG dos pares de cores usados; contagem de passos | Pares de texto ≥ 4,75:1; cesta → pedido em 2 ações (escolher pagamento, Finalizar); 4 com dinheiro e troco | `03 - Designer System/design-system.md` | ⚠️ Parcial: **sem auditoria com leitor de tela nem com ferramenta automática (ex.: Lighthouse)** | |
| CT-39 | RNF-07 Status em ≤ 10 s sem recarregar | Polling de 5 s; captura 6,5 s após a mudança | Status atualizado sem recarregar | telas 05 → 08 | ✅ | |
| CT-40 | RNF-08 Decimal | Teste automatizado no `information_schema` | Todas as colunas monetárias são `numeric` | `orders.test.ts` | ✅ | |
| CT-41 | RNF-09 `docker compose up -d --build` + persistência | Subida completa; pedido criado; `down` + `up`; pedido consultado | 4 serviços *healthy*; pedido #1001 preservado; seed não duplicou | `rnf09-docker-compose.txt` | ✅ no ambiente do assistente; **a equipe deve repetir em outra máquina** (exigência do guia) | |
| CT-42 | RNF-10 Base multiempresa (opcional) | Inspeção do schema | `empresaId` em StoreConfig, Category, Dish e Order | `schema.prisma` | ✅ | |

## Defeitos encontrados durante os testes

| # | Defeito | Como apareceu | Correção |
|---|---|---|---|
| D-01 | A finalização do pedido travava por 5 s e retornava erro 500 | 9 testes de pedido falharam no primeiro run | A configuração era lida pela conexão global **dentro** da transação. Passou a ser lida antes da transação (`orders.ts`). Rerun: 50/50. |
| D-02 | A ilustração das massas parecia ter hashis em vez de garfo | Revisão visual da captura | Desenho trocado por um garfo (`seed.ts`) |
| D-03 | O laranja da marca não atinge 4,5:1 com texto branco nem como texto sobre papel creme | Cálculo de contraste | Botões com texto escuro e token `primary-text` (#A8471A) para preços (`tailwind.config.js`) |
