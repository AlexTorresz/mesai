# 10 — Roteiro dos 18 slides

Mapeado a partir do guia do professor (`Guia_Interativo_de_Vibe_Coding.html`, seção “Guia dos 18 slides”).
**Campos entre colchetes [ ] são da equipe.** Não invente datas, métricas ou feedback: use apenas o que estiver registrado.

| Slide | Tema | O que mostrar | Evidência pronta no repositório | Aluno |
|---|---|---|---|---|
| 01 | Capa | mesaí — Cantina 67, [integrantes], [turma], [data] | Logo: tela 01 | 1 |
| 02 | Roteiro | Descoberta → Desenho → Construção → Entrega | — | 1 |
| 03 | Identificação | “Cardápio digital e pedidos que mostram à equipe quantos pedidos chegam, em que estado estão e quanto rendem.” + papéis | `README.md` | 1 |
| 04 | Problema | Seção 1 da especificação: equipe sem visibilidade de pedidos, status e ganhos | `01 - Requisitos/requisitos-mesai-v0.2.md` | 1 |
| 05 | Linha do tempo | [datas reais]: ideia → requisitos v0.2 → manual → código, testes e Docker (25/11/2026) → entrega | `04 - Prompt/registro-de-prompts.md` | 1 |
| 06 | Requisitos | 32 RF, 10 RNF, 12 RN; como a IA ajudou e o que a equipe validou | `01 - Requisitos/` (matriz e decisões) | 1 |
| 07 | Técnicas e modelos | Modelo de dados (Prisma), fluxo de status RN-01, matriz de rastreabilidade | `schema.prisma`, matriz | 2 |
| 08 | Prototipação | Mockup do manual × tela real | `02 - mockup/README.md` (tabela de correspondência) | 2 |
| 09 | Virada do protótipo | Ex.: botão laranja com texto branco (3,22:1) → texto escuro (5,71:1); EXCLUIR → nome do prato | `03 - Designer System/design-system.md` §4 | 2 |
| 10 | Arquitetura | Navegador → Nginx → Express → Prisma → PostgreSQL (+ Mailpit) | `05 - Desenvolvimento/README.md` | 3 |
| 11 | Ferramentas | React, TS, Vite, Tailwind, Node, Express, Prisma, PostgreSQL, Docker, Vitest, Claude | `README.md` (Stack) | 3 |
| 12 | IA na construção | Prompt decisivo + o que foi revisado e corrigido | `04 - Prompt/registro-de-prompts.md` §1 e §4 | 3/5 |
| 13 | Dificuldades | Até 3 reais. Disponíveis: D-01 (transação travando), D-03 (contraste), build Docker sem rede/429 | `07 - Testes/casos-de-teste.md` (Defeitos) + [as da equipe] | 3/4 |
| 14 | Demonstração | Roteiro de 60 s com 2 navegadores; [QR/URL se houver deploy] | `08 - Deploy/README.md` | 4 |
| 15 | Métricas | 32/32 RF implementados; 50/50 testes aprovados; 40 de 42 CT aprovados e 2 parciais; resposta máx. 0,03 s; [tempo estimado × real da equipe] | `07 - Testes/` | 4 |
| 16 | Próximas versões | Perfis Cozinha/Motorista; tempo por distância; relatórios | `09 - Melhorias/backlog-e-limitacoes.md` | 5 |
| 17 | Lições aprendidas | [da equipe] + uso crítico da IA (ex.: o teste automatizado pegou um bug que a IA tinha criado) | `04 - Prompt/` | 5 |
| 18 | Encerramento | Agradecimento, [link do GitHub], [link da aplicação] | — | 5 |

## Divisão dos 10 minutos (do guia)

0:00–2:00 Aluno 1 (slides 1–6) · 2:00–4:00 Aluno 2 (7–9) · 4:00–6:00 Aluno 3 (10–12) · 6:00–8:00 Aluno 4 (13–15) · 8:00–10:00 Aluno 5 (16–18)
