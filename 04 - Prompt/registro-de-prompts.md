# Registro do uso de IA

**Ferramenta:** Claude (Anthropic), modelo Claude Opus 5.5, em sessão agêntica com acesso ao computador do grupo.
**Data:** 25/11/2026.

> O guia do professor exige que os alunos **compreendam, revisem, validem e expliquem** o que a IA gerou. Este registro mostra o que foi pedido, o que a IA decidiu e o que foi corrigido durante a execução. A seção “Revisão humana” deve ser preenchida pela equipe.

## 1. Prompt decisivo (enviado pelo grupo)

Anexos: `requisitos-mesai.md` (v0.2), `Manual_de_Identidade_Visual.pdf`, `Documentacao_Completa_Mesai.pdf` e, em seguida, o `Guia Interativo de Vibe Coding` (HTML do professor).

> “Seguindo estas documentações. A Stack, de preferência deve ser: Frontend React + Typescript, Vite, Tailwind CSS. Backend Node.js, Express. Database Prisma ORM, PostgreSQL. O restante, eu deixo você assumir o controle e outras regras e tudo mais. Preciso apenas deste sistema.”
>
> “Acima de todas as documentações e .pdf que eu enviei, deve estar esse .html. Foi o que o nosso professor exigiu no mínimo para o nosso trabalho de AV2. Por exemplo, a questão do Docker e etc. […] se algo divergir, o .html é o veredito final.”

## 2. Como a IA trabalhou (ordem real)

1. Leitura dos 4 documentos e definição da prioridade: **guia > especificação v0.2 > documentação > manual**.
2. Modelagem de dados (`schema.prisma`) a partir das RN-01 a RN-12 e da seção 13 da documentação; migração SQL gerada pelo Prisma.
3. Backend: autenticação (sessão única + inatividade), regras de pedido, cardápio, perfis. Cada rota foi comentada com o RF/RN que atende.
4. Testes automatizados escritos **por caso de teste** da matriz (CT-01 a CT-32 + RNF-08), executados contra o banco.
5. Frontend seguindo o manual (tokens, temas, telas por perfil).
6. Navegação real com navegador automatizado (Chrome headless) e 16 capturas.
7. Docker: `compose.yaml`, Dockerfiles, `.env.example`, healthchecks e volumes. Executado `docker compose up -d --build` e testada a persistência após `down`/`up`.
8. Documentação nas pastas 01–10.

## 3. Decisões tomadas pela IA (precisam de aprovação da equipe)

Todas estão em `01 - Requisitos/decisoes-de-implementacao.md`. As mais importantes:

- Três perfis (Cliente/Colaborador/Gerente) da especificação, e não os cinco do manual.
- Confirmação de exclusão pelo **nome do prato** (RF-18), e não pela palavra EXCLUIR (manual).
- Tempo estimado **fixo e configurável** (sem API de mapas).
- Texto escuro sobre os botões laranja (contraste da RNF-06), divergindo do mockup.
- Resumo financeiro mínimo do dia para o Gerente (ligado ao problema da seção 1).

## 4. Erros da IA encontrados e corrigidos durante a execução

| # | O que aconteceu | Como foi detectado | Correção |
|---|---|---|---|
| 1 | A rota de finalizar pedido lia a configuração **fora** da transação do banco, o que causava travamento e erro 500 | 9 testes automatizados falharam | Leitura movida para antes da transação; 50/50 testes passaram |
| 2 | A ilustração de massas tinha “hashis” (incoerente com cantina italiana) | Revisão visual da captura | Trocada por garfo |
| 3 | Botões laranja com texto branco (como no mockup) reprovavam o contraste mínimo | Cálculo WCAG | Texto escuro e laranja mais escuro para preços |
| 4 | O primeiro `docker compose up` falhou no ambiente da IA por falta de acesso à internet dentro do build e por limite de downloads do Docker Hub (429) | Log do build | Problema do ambiente, não do projeto: repetido com proxy de rede; **sem alterar os Dockerfiles entregues** |

## 5. Revisão humana (preencher pela equipe)

| Data | Integrante | O que revisou / testou | Alterou algo? |
|---|---|---|---|
| | | | |
| | | | |

Sugestão de prompt para revisar um módulo (Etapa 05 do guia):

> “Atue como desenvolvedor full-stack sênior. Explique, linha a linha, o que `05 - Desenvolvimento/backend/src/routes/orders.ts` faz para atender RF-26, RF-27, RF-31 e RF-32, quais casos de erro trata e como o teste correspondente em `tests/orders.test.ts` comprova cada critério. Aponte riscos ou melhorias.”
