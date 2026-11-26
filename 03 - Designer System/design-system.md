# Design System — mesaí “Retrô Organizado”

Implementação do *Manual de Identidade Visual* (pasta 02) no código do frontend.
**Fonte da verdade no código:** `05 - Desenvolvimento/frontend/tailwind.config.js` (tokens) e `src/index.css` (temas e componentes).

## 1. Cores

| Token (Tailwind) | Nome oficial | HEX | Uso |
|---|---|---|---|
| `charcoal` | Carvão Padrão | `#252527` | Fundo do tema Carvão; texto sobre cartões claros |
| `deep` | Carvão Profundo | `#1D1D1F` | Barra lateral e cabeçalho mobile (tema Carvão) |
| `secondary` | Marrom Torrado | `#5C3A21` | Botões secundários, selos de categoria |
| `primary` | Laranja Brasa | `#E86A24` | **Fundo** de ações principais, aba ativa, selo de desconto |
| `primary-text` | Laranja Brasa (texto) | `#A8471A` | **Texto** de preços e destaques sobre papel (ver seção 4) |
| `cream` | Papel Comanda | `#F5EFE6` | Cartões, formulários, texto claro |
| `mustard` | Mostarda Retrô | `#D99B26` | Alertas, status “Recebido”, foco do teclado |
| `ink` | Contorno Sólido | `#141415` | Bordas de 2 px e sombras sólidas |
| `muted` | — | `#6B5E52` | Texto secundário sobre papel |
| `danger` | — | `#B3261E` | Cancelar pedido, erros |
| `success` | — | `#2F6B3A` | “Entregue”, confirmações |

### Temas (alternância no menu lateral, na tela de login e em Configurações)

| Variável CSS | Carvão Padrão (Dark Retrô) | Creme Retrô (Light Diner) |
|---|---|---|
| `--bg-app` | `#252527` | `#F4ECE1` |
| `--bg-sidebar` | `#1D1D1F` | `#4A2C18` |
| `--bg-card` | `#F5EFE6` | `#FFFDF9` |
| `--text-on-app` | `#F5EFE6` | `#252527` |
| `--text-on-app-muted` | `#B9B2A8` | `#6B5E52` |

A escolha fica salva no navegador (`localStorage`, chave `mesai-theme`).

## 2. Tipografia

| Família | Pesos | Onde | Classe |
|---|---|---|---|
| Fraunces | 700, 900 | Logotipo, títulos de página, nomes de pratos, totais | `font-display` |
| Plus Jakarta Sans | 400–700 | Textos, descrições, formulários, itens da cesta | `font-sans` (padrão) |
| JetBrains Mono | 500, 700 | Nº da comanda, preços, %, CPF, telefone, status, rótulos | `font-mono` |

As fontes são empacotadas com `@fontsource`, então funcionam **sem internet**, inclusive na demonstração.
Escala: título de página 28–32 px (Fraunces 900, `-0.02em`); título de cartão 19 px (Fraunces 700); corpo 13–14 px; selos 10–11 px em caixa alta.

## 3. Geometria e componentes

| Regra do manual | Implementação |
|---|---|
| Bordas sólidas de 2 px `#141415` | `border-2 border-ink` em `.card`, `.btn`, `.input`, `.badge` |
| Sombra sólida 4 px em cartões e 2 px em botões | `shadow-hard` (4 px 4 px 0) / `shadow-hard-sm` (2 px 2 px 0) |
| Divisor de comanda tracejado | `.divider-comanda` (2 px dashed) |
| Raio 10 px em containers, 8 px em botões e campos | `rounded-box` / `rounded-ctl` |
| Botão “afunda” ao clicar | `active:translate-x-[2px] active:translate-y-[2px] active:shadow-none` |

Componentes (`src/index.css` e `src/components/ui.tsx`): `.card`, `.btn-primary`, `.btn-secondary`, `.btn-light`, `.btn-danger`, `.btn-sm`, `.input`, `.label`, `.badge`, `.tab`, `.price`, `.page-title`, `.section-title`, `<Modal>`, `<Field>`, `<StatusBadge>`, `<QtyStepper>`, `<Empty>`, `<FormError>`, `<Spinner>`, `<Logo>`.

### Status do pedido (`<StatusBadge>`)

| Status | Fundo / texto |
|---|---|
| Recebido | Mostarda / ink |
| Em preparação | Laranja / ink |
| Em transporte | Marrom / creme |
| Entregue | Verde / creme |
| Cancelado | Vermelho / creme |

### Logotipo

`<Logo>` mostra “mesa**í**”: Fraunces 900 em caixa baixa, com o “í” em Laranja Brasa. Na barra lateral escura usa creme (versão principal sobre carvão).

## 4. Acessibilidade — contraste (RNF-06: mínimo 4,5:1)

Valores calculados pela fórmula WCAG 2.1 de luminância relativa:

| Combinação | Contraste | Resultado |
|---|---|---|
| Branco sobre Laranja Brasa (como nos mockups) | 3,22:1 | ❌ reprovaria |
| **Ink `#141415` sobre Laranja Brasa** (botões primários) | **5,71:1** | ✅ adotado |
| Laranja Brasa como texto sobre Papel Comanda | 2,82:1 | ❌ reprovaria |
| **`#A8471A` sobre Papel Comanda** (preços) | **5,13:1** | ✅ adotado |
| `#A8471A` sobre Marfim `#FFFDF9` (tema Creme) | 5,77:1 | ✅ |
| Laranja Brasa sobre Carvão (texto em fundo escuro) | 4,75:1 | ✅ |
| Papel Comanda sobre Carvão | 13,38:1 | ✅ |
| Carvão sobre Creme Fundo | 13,06:1 | ✅ |
| Papel Comanda sobre Marrom Torrado | 8,82:1 | ✅ |
| Ink sobre Mostarda | 7,60:1 | ✅ |
| `#B9B2A8` (texto secundário) sobre Carvão | 7,28:1 | ✅ |
| `#6B5E52` (texto secundário) sobre Papel / Creme | 5,49 / 5,36:1 | ✅ |
| Creme sobre Vermelho `#B3261E` | 5,72:1 | ✅ |

**Decisão (D-03):** o laranja continua sendo a cor de destaque, mas com texto escuro por cima e, quando ele mesmo é o texto, na variação mais escura `#A8471A`. Isso preserva a identidade e cumpre a RNF-06.

Outras práticas: foco visível em mostarda (`:focus-visible`), rótulos ligados aos campos (`<label htmlFor>`), `aria-invalid` e mensagens de erro ligadas aos campos, `role="alert"` nos avisos, `aria-live` nos toasts e no contador de quantidade, modais fecham com Esc, áreas de toque de no mínimo 32–40 px.

## 5. Responsividade (RNF-04)

- **< 1024 px:** cabeçalho fixo com logo, atalho “Cesta N” e menu em gaveta.
- **≥ 1024 px:** barra lateral fixa de 264 px.
- Grade do cardápio: 1 coluna (celular), 2 (tablet), 3 (desktop), como pede o manual.
- Tabelas largas (comanda, usuários) ganham rolagem horizontal dentro do cartão.
