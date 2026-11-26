# 02 — Mockup

| Arquivo | O que é |
|---|---|
| `Manual_de_Identidade_Visual_mesai.pdf` | Manual “Retrô Organizado”. Páginas 7–8: mockups de Login, Cardápio, Cesta/Pagamento e Painel operacional. Páginas 9–10: visões por perfil. |

## Do mockup ao sistema

As telas implementadas seguem os mockups do manual, com os ajustes registrados em `01 - Requisitos/decisoes-de-implementacao.md` (perfis, status e confirmação de exclusão da especificação v0.2; contraste da RNF-06).
Capturas reais do sistema para comparar com os mockups (antes/depois, slides 8–9): `07 - Testes/evidencias/telas/`.

| Mockup do manual | Tela implementada |
|---|---|
| p. 7 — Home exclusiva de login, cadastro e recuperação sob demanda | `01-login.png`, `02-cadastro-sob-demanda.png` |
| p. 7 — Barra lateral + Cardápio & Descontos | `03-cardapio-cliente.png`, `09-cardapio-gerente.png` |
| p. 8 — Cesta, pagamento presencial e troco | `04-cesta-pagamento-troco.png` |
| p. 8 — Pedido ativo / rastreio | `05-pedido-recebido.png`, `08-cliente-atualizado-sem-recarregar.png` |
| p. 8 — Painel operacional (status + cobrança presencial) | `06-painel-colaborador.png`, `07-painel-em-preparacao.png` |
| p. 9 — Painel gerencial (Criar Categoria / Cadastrar Prato / Preço-Desconto) | `09-cardapio-gerente.png`, `10-modal-desconto.png` |
| p. 4 — Tema Creme Retrô | `13-tema-creme.png` |

> **Pendente pela equipe (Etapa 03 do guia):** observar uma pessoa real usando o protótipo ou o sistema numa tarefa típica (ex.: “faça um pedido de 2 lasanhas pagando em dinheiro com troco para R$ 150”) e registrar aqui o feedback e o que mudou.
