# Mesaí — Cantina 67 | Especificação de Requisitos

**Versão:** 0.2 (rascunho para revisão da equipe)
**Projeto:** AV2 de Coding — sistema web responsivo de cardápio digital e pedidos
**Escopo:** uma única empresa (Cantina 67, restaurante italiano familiar)
**Pasta de destino:** `01 - Requisitos`


---

## 1. Problema e objetivo

Funcionários e gestores da Cantina 67 não conseguem saber quantos pedidos chegam nem em que estado cada um está, e também precisam acompanhar o que o restaurante ganha com os pedidos. O Mesaí permite que o cliente faça pedidos pelo cardápio digital e que a equipe do restaurante receba, acompanhe e atualize cada pedido.

**Critério de sucesso da demonstração:** um Cliente cadastrado monta uma cesta, finaliza o pedido, o Colaborador o vê como "Recebido", avança até "Entregue", e o Cliente acompanha cada mudança com o total correto.

## 2. Perfis de usuário

| Perfil | Pode |
|---|---|
| **Cliente** | Ver o cardápio, montar a cesta, finalizar e cancelar pedidos (conforme RN-02), acompanhar pedidos, editar seus dados |
| **Colaborador** | Ver pedidos, alterar status, cancelar com motivo, marcar prato como indisponível |
| **Gerente** | Tudo do Colaborador + gerenciar categorias e pratos, definir perfis de usuários, endereço do estabelecimento e taxa de entrega, ver o painel de indisponibilidades |

## 3. Regras de negócio

- **RN-01 — Status do pedido.** O pedido nasce como **Recebido pelo estabelecimento** quando o Cliente finaliza. A sequência é: Recebido → Em preparação → Em transporte → Entregue. Aceitar o pedido equivale a movê-lo para Em preparação. Não é permitido voltar a status anteriores. **Cancelado** é um status à parte.
- **RN-02 — Cancelamento.**
  - O **Cliente** cancela sem informar motivo, apenas enquanto o pedido estiver em **Recebido**.
  - O **Colaborador/Gerente** cancela informando motivo obrigatório, em qualquer status antes de Entregue.
  - O motivo fica visível para o Gerente e para o Cliente.
  - Entregue e Cancelado são estados finais.
- **RN-03 — Preço congelado.** Ao finalizar, o pedido guarda uma cópia, por item, do nome, valor unitário, percentual de desconto, valor unitário com desconto e quantidade, além do valor do frete. Alterações posteriores no prato não afetam pedidos existentes.
- **RN-04 — Cálculo do total.** O desconto é aplicado individualmente em cada prato, nunca sobre o total.
  - Valor unitário com desconto = valor × (1 − desconto/100), arredondado matematicamente para 2 casas.
  - Subtotal do item = valor unitário com desconto × quantidade.
  - **Total = soma dos subtotais + frete.**
- **RN-05 — Exclusão de prato.** Exclusão lógica: o prato some do cardápio, mas permanece nos pedidos antigos.
- **RN-06 — Sessão única.** Um novo login derruba a sessão anterior do mesmo usuário. Há logout automático por inatividade.
- **RN-07 — Hierarquia de perfis.** Existe um Gerente padrão criado por seed. Esse Gerente não pode ser rebaixado por si nem por outros, mas pode rebaixar outros Gerentes. A mudança de perfil é feita apenas por Gerente.
- **RN-08 — Pagamento.** Pagamento sempre na entrega, ao entregador, por Pix, crédito, débito, vale-refeição ou dinheiro. Em dinheiro, o Cliente informa se precisa de troco ou o valor que vai pagar, e esse valor deve ser **maior ou igual ao total** (frete incluído).
- **RN-09 — Disponibilidade e cesta.** Se um prato da cesta ficar indisponível, o Cliente é avisado e a finalização fica bloqueada até que o prato seja removido da cesta.
- **RN-10 — Unicidade.** E-mail e CPF são únicos. O CPF não pode ser alterado após o cadastro.
- **RN-11 — Recuperação de senha.** O link é de uso único e expira em 30 minutos.
- **RN-12 — Desconto.** Percentual aplicado sobre o valor fixo do prato. O limite de desconto será entre 0.1 a 100.

## 4. Requisitos funcionais e critérios de aceitação

### 4.1 Cadastro e acesso

| ID | Requisito | Critério de aceitação |
|---|---|---|
| RF-01 | Cadastro com nome completo, telefone, e-mail, senha, CPF, CEP e número. Complemento e referência são opcionais. | Sem qualquer campo obrigatório, o cadastro é recusado com mensagem; com todos preenchidos, o usuário é criado como Cliente. Complemento e referência vazios não impedem o cadastro. |
| RF-02 | Validar o CPF pelo cálculo dos dígitos verificadores. | CPF com dígitos inválidos ou todos iguais (ex.: 111.111.111-11) é recusado; CPF válido é aceito. |
| RF-03 | E-mail e CPF únicos. | Cadastrar e-mail ou CPF já existente é recusado com mensagem clara. |
| RF-04 | Login e logout. | Credenciais corretas abrem a sessão; incorretas mostram erro sem revelar qual campo falhou; logout encerra a sessão. |
| RF-05 | Recuperação de senha por link único enviado por e-mail. | O link redefine a senha uma vez; reutilizá-lo falha; após 30 minutos ele é recusado. |
| RF-06 | Sessão única por usuário. | Com a sessão aberta na máquina A, logar na máquina B encerra a sessão da A (a próxima ação na A exige novo login). |
| RF-07 | Logout por inatividade. | Após o tempo de inatividade definido, a próxima ação redireciona para o login. Tempo: 30 minutos |

### 4.2 Perfis e configurações

| ID | Requisito | Critério de aceitação |
|---|---|---|
| RF-08 | Controle de permissões por perfil. | Cliente e Colaborador que tentam acessar telas ou endpoints do Gerente recebem acesso negado, inclusive chamando a rota diretamente. |
| RF-09 | O Cliente edita nome, telefone, e-mail, endereço e senha. | A alteração é salva; e-mail novo continua sujeito à unicidade; CPF não é editável. Trocar a senha exige informar a senha atual. |
| RF-10 | O Gerente define um usuário como Cliente, Colaborador ou Gerente. | O perfil novo vale no próximo acesso do usuário alterado. Um Gerente comum não consegue alterar o Gerente seed. |
| RF-11 | Gerente padrão criado por seed. | Após subir o banco vazio, existe exatamente um Gerente inicial que consegue logar; ele não pode ser rebaixado por si mesmo. |
| RF-12 | O Gerente define o endereço do estabelecimento. | O endereço é salvo e é usado como origem do tempo estimado. |
| RF-13 | O Gerente define o valor da taxa de entrega. | O valor configurado aparece na cesta e entra no total. Valor de entrega: R$ 10,00 |

### 4.3 Cardápio

| ID | Requisito | Critério de aceitação |
|---|---|---|
| RF-14 | O Cliente vê pratos com nome, descrição, valor e foto, separados por categoria. | Cada prato disponível aparece sob sua categoria com os quatro dados. Prato com desconto mostra valor original e valor com desconto. |
| RF-15 | O Gerente cria, edita e remove categorias. | A categoria nova aparece na listagem e pode receber pratos. |
| RF-16 | O Gerente cria prato com nome, descrição, valor e foto obrigatórios. | Faltando qualquer um dos quatro, o prato não é criado. |
| RF-17 | O Gerente edita o prato, alterando o valor fixo ou aplicando desconto em %. | Ao escolher desconto, aparece a aba de desconto; o valor com desconto é exibido ao Cliente. |
| RF-18 | O Gerente exclui prato confirmando o nome digitado. | A exclusão só prossegue se o texto digitado for igual ao nome do prato; o prato some do cardápio e continua nos pedidos antigos. |
| RF-19 | O Colaborador marca prato como indisponível (e disponível de volta). | Prato indisponível não pode ser adicionado à cesta. |
| RF-20 | Painel de indisponibilidades para o Gerente. | Cada marcação registra prato, Colaborador responsável e data/hora, e aparece no painel. |

### 4.4 Pedido do Cliente

| ID | Requisito | Critério de aceitação |
|---|---|---|
| RF-21 | Adicionar prato à cesta com quantidade, podendo continuar explorando o cardápio. | Itens de pratos diferentes coexistem na cesta com suas quantidades. |
| RF-22 | Alterar a cesta: reduzir quantidade (se maior que 1) ou excluir item. | O botão de reduzir não leva a quantidade abaixo de 1; excluir remove o item e atualiza o total. |
| RF-23 | Total da cesta com desconto por prato e frete. | O total confere com RN-04 em casos com e sem desconto e em quantidades diferentes. |
| RF-24 | Bloquear a finalização se houver prato indisponível na cesta. | O Cliente vê aviso indicando o prato e o botão de finalizar fica desabilitado até a remoção. |
| RF-25 | Escolher a forma de pagamento; em dinheiro, informar troco ou valor a pagar. | Valor em dinheiro menor que o total é recusado; maior ou igual é aceito. |
| RF-26 | Finalizar o pedido. | O pedido nasce em **Recebido** com os preços congelados (RN-03) e a cesta é esvaziada. |
| RF-27 | O Cliente cancela o pedido (sem motivo). | Permitido apenas na janela da RN-02; fora dela a ação é negada. O status vira Cancelado. |
| RF-28 | O Cliente acompanha o pedido: itens, valores, status, tempo estimado de chegada e motivo de cancelamento (se houver). | Mudanças de status feitas pelo Colaborador aparecem para o Cliente conforme RNF-07. Motivo de cancelamento feito por Colaborador é exibido. |
| RF-29 | Histórico de pedidos do Cliente. | O Cliente vê seus pedidos, e somente os seus. |

### 4.5 Gestão de pedidos (Colaborador/Gerente)

| ID | Requisito | Critério de aceitação |
|---|---|---|
| RF-30 | Listar pedidos em duas abas: Em Produção e Finalizados. | Pedido Entregue passa de Em Produção para Finalizados. Pedidos Cancelados ficam em Finalizados. |
| RF-31 | Alterar o status do pedido na sequência da RN-01. | Só o próximo status é permitido; voltar a um status anterior ou pular etapa é negado. |
| RF-32 | Cancelar pedido com motivo obrigatório. | Sem motivo, o cancelamento é recusado; com motivo, o status vira Cancelado e o motivo fica visível para Gerente e Cliente. |

## 5. Requisitos não funcionais

Os valores numéricos são propostas para a equipe ajustar.

| ID | Requisito | Critério verificável |
|---|---|---|
| RNF-01 | Senhas armazenadas com hash e salt. | Nenhuma senha em texto puro no banco ou nos logs. |
| RNF-02 | Autorização validada no backend. | Teste de acesso direto às rotas com perfil insuficiente retorna negado. |
| RNF-03 | Privacidade (LGPD): CPF e dados pessoais não aparecem em logs nem em telas desnecessárias. | Inspeção de logs e telas. |
| RNF-04 | Responsividade. | Telas principais usáveis a partir de 360 px de largura e em desktop. |
| RNF-05 | Desempenho. | Listagem do cardápio e ações de pedido respondem em até 2 s no ambiente de demonstração. |
| RNF-06 | Usabilidade e acessibilidade. | Contraste mínimo de 4,5:1 em textos; fluxo cesta → pedido finalizado em poucos passos. |
| RNF-07 | Atualização de status sem recarregar a página. | Mudança de status aparece ao Cliente em até 10 s. |
| RNF-08 | Integridade monetária. | Valores guardados em tipo decimal ou centavos inteiros, nunca em ponto flutuante. |
| RNF-09 | Execução reproduzível. | `docker compose up -d --build` sobe o sistema e os dados persistem após reinício. |
| RNF-10 | Isolamento da base para evolução multiempresa. | Opcional: tabelas principais com identificador de empresa, sem uso no MVP. |

## 6. Pendências para a equipe fechar

| # | Pendência | Sugestão |
|---|---|---|
| P-01 | Em qual status o Cliente pode cancelar, já que "Aceito" deixou de existir? | Apenas em Recebido. |
| P-02 | Como o frete é calculado? | Valor fixo configurado pelo Gerente (RF-13). |
| P-03 | Como calcular o tempo estimado de chegada (RF-28)? | Estimativa simples por faixa ou tempo fixo; API de mapas fica como melhoria futura. |
| P-04 | Tempo de inatividade para logout. | 30 minutos. |
| P-05 | Em que status o Colaborador pode cancelar? Onde ficam os cancelados? | Qualquer um antes de Entregue; aba Finalizados. |
| P-06 | Limite do desconto. | 0 a 100%. |
| P-07 | Arredondamento: por unidade ou por linha? | Por unidade, antes de multiplicar. |
| P-08 | O Gerente seed pode ser rebaixado por outro Gerente? Um Gerente comum pode se rebaixar? | Seed protegido de todos; Gerente comum pode se rebaixar. |
| P-09 | Trocar senha exige a senha atual? | Sim. |

## 7. Matriz de rastreabilidade

As colunas "Tela" e "Código" serão preenchidas nas etapas 3 e 5.

| Requisito | Regra | Caso de teste | Tela | Código |
|---|---|---|---|---|
| RF-01 | RN-10 | CT-01 cadastro completo e incompleto | | |
| RF-02 | RN-10 | CT-02 CPF válido, inválido e repetido (111...) | | |
| RF-03 | RN-10 | CT-03 e-mail e CPF duplicados | | |
| RF-04 | — | CT-04 login correto e incorreto | | |
| RF-05 | RN-11 | CT-05 link válido, reutilizado e expirado | | |
| RF-06 | RN-06 | CT-06 segundo login derruba o primeiro | | |
| RF-07 | RN-06 | CT-07 logout por inatividade | | |
| RF-08 | RN-07 | CT-08 acesso negado por perfil (inclusive via rota) | | |
| RF-09 | RN-10 | CT-09 edição de dados e unicidade do e-mail | | |
| RF-10 | RN-07 | CT-10 promover e rebaixar perfis | | |
| RF-11 | RN-07 | CT-11 seed do Gerente e proteção | | |
| RF-12 | — | CT-12 endereço do estabelecimento | | |
| RF-13 | RN-04 | CT-13 frete configurado entra no total | | |
| RF-14 | — | CT-14 listagem por categoria com desconto | | |
| RF-15 | — | CT-15 CRUD de categorias | | |
| RF-16 | — | CT-16 criação com campos obrigatórios | | |
| RF-17 | RN-12 | CT-17 edição de valor e desconto | | |
| RF-18 | RN-05 | CT-18 exclusão com confirmação do nome | | |
| RF-19 | RN-09 | CT-19 prato indisponível não vai à cesta | | |
| RF-20 | — | CT-20 registro de quem e quando | | |
| RF-21 | — | CT-21 adicionar itens à cesta | | |
| RF-22 | — | CT-22 reduzir e excluir itens | | |
| RF-23 | RN-04 | CT-23 total com desconto por item e frete | | |
| RF-24 | RN-09 | CT-24 bloqueio por item indisponível | | |
| RF-25 | RN-08 | CT-25 dinheiro menor, igual e maior que o total | | |
| RF-26 | RN-01, RN-03 | CT-26 pedido nasce Recebido com preços congelados | | |
| RF-27 | RN-02 | CT-27 cancelamento do Cliente dentro e fora da janela | | |
| RF-28 | RN-01, RN-02 | CT-28 acompanhamento de status e motivo | | |
| RF-29 | — | CT-29 histórico só do próprio Cliente | | |
| RF-30 | RN-01 | CT-30 abas Em Produção e Finalizados | | |
| RF-31 | RN-01 | CT-31 sequência de status sem retrocesso | | |
| RF-32 | RN-02 | CT-32 cancelamento com motivo obrigatório | | |
| RNF-01 a RNF-10 | — | CT-33 a CT-42 verificações não funcionais | | |

Casos de teste devem ser escritos com ID, pré-condição, passos, entrada, resultado esperado e evidência, e só contam como executados quando houver registro real do resultado.
