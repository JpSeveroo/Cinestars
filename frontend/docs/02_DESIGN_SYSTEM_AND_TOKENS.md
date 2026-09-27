# CineStars — Design System & Tokens

Este documento é a fonte única de verdade visual do CineStars. Toda implementação de UI (frontend real, não o protótipo estático) deve derivar exclusivamente destes tokens — não introduzir cores, fontes, raios ou espaçamentos fora do que está aqui especificado.

Conceito: um "cinema noturno" — fundo grafite-azulado profundo, tipografia de marquise (serifa) para identidade, dourado como luz de destaque sobre o escuro. Ícones são sempre SVG de contorno (stroke), nunca emoji.

---

## 1. Paleta de Cores

| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#12141c` | Fundo principal da aplicação |
| `--bg2` | `#191c27` | Fundo de inputs, tabs inativas, thumbnails |
| `--card` | `#1f2330` | Superfície de cards, avatares, pôsteres |
| `--line` | `#2c3040` | Bordas, divisores, ícones/placeholders inativos |
| `--gold` | `#e8b44c` | Cor de destaque (marquise): ações primárias, estados ativos, estrelas, logo |
| `--teal` | `#4fb3a2` | Cor secundária: tags de gênero |
| `--text` | `#f1eee6` | Texto principal (off-white quente) |
| `--muted` | `#9a9fb0` | Texto secundário, labels, metadados |
| `--danger` | `#d9765a` | Alertas, tag de spoiler, ações destrutivas |

Regras de uso:
- `--gold` é a **única** cor de destaque interativo. Não usar para texto de corpo nem em excesso — reservar para: botão primário, item ativo (nav/tab/pill), preenchimento de estrelas, favorito ativo.
- `--danger` é reservado a spoiler e exclusão — nunca decorativo.
- Nunca usar preto puro (`#000`) ou branco puro (`#fff`).
- Texto de corpo sobre fundo escuro usa `#cfcdc6` (leve variação de `--text`, mais suave para blocos longos de leitura como sinopse e resenhas).

---

## 2. Tipografia

| Família | Papel | Pesos usados | Fonte |
|---|---|---|---|
| **Fraunces** (serifa) | Display / identidade — logo, títulos de tela (`h1`), títulos de seção, avatar de perfil | 500, 600 | Google Fonts |
| **Inter** (sans) | UI e corpo — tudo o mais: nav, botões, inputs, cards, texto de resenha | 400, 500, 600, 700 | Google Fonts |

Regra: serifa só aparece em identidade e headings de tela — nunca em botões, inputs, labels ou corpo de texto.

### Escala tipográfica

| Elemento | Tamanho | Peso | Família |
|---|---|---|---|
| Logo (sidebar) | 1.4rem | 600 | Fraunces |
| Título de tela (`.h-title`) | 1.8rem | 600 | Fraunces |
| Avatar de perfil (inicial) | 1.6rem | — | Fraunces |
| Título de seção (`.section-title`) | 1.05rem | 600 | Inter |
| Número de estatística (`.stat b`) | 1.3rem | — | Fraunces |
| Título de card de filme | 0.85rem | 600 | Inter |
| Corpo / inputs / botões | 0.92rem | 400–600 | Inter |
| Subtítulo de tela (`.h-sub`) | 0.95rem | 400 | Inter, cor `--muted` |
| Metadados (ano, data, hint) | 0.75–0.8rem | 400 | Inter, cor `--muted` |

Line-height do corpo de leitura (sinopse, resenhas): `1.5`–`1.6`. Largura máxima de linha de sinopse: `60ch`.

---

## 3. Espaçamento, Raio e Bordas

- Unidade base implícita: múltiplos de `4px` (4/6/8/10/12/14/16/22/26/34/40).
- Raio de borda por contexto (nunca um único raio global):
  - Cards, pôsteres, inputs, botões retangulares: `8–10px`
  - Pills (status, tabs internas): `20px` (totalmente arredondado)
  - Avatares, botão de favorito, marcador circular: `50%`
  - Tags (gênero, spoiler): `20px` / `10px` respectivamente (pequenas, tipo "chip")
- Borda padrão: `1px solid var(--line)` em cards, inputs, divisores e pills inativas.
- Estado ativo/selecionado substitui a borda por `1px solid var(--gold)` + fundo `rgba(232,180,76,.1)` — nunca preenchimento sólido de cor no estado ativo de pill.

---

## 4. Layout

- Casca do app: sidebar fixa de navegação (`210px`) + área de conteúdo fluida, contidas em um wrapper centralizado de `max-width: 1180px`.
- Sidebar: fundo igual ao body, separada por `1px solid var(--line)` à direita, padding `28px 18px`, `position: sticky`.
- Conteúdo principal: padding `34px 40px`.
- Grade de catálogo: `repeat(auto-fill, minmax(140px, 1fr))`, gap `16px`.
- Grade de favoritos (perfil): 4 colunas fixas, gap `12px`.
- Pôster: proporção `2/3` sempre.
- Responsivo: abaixo de tablet, a sidebar deve colapsar para navegação inferior ou hambúrguer (não implementado no protótipo estático — obrigatório na implementação real).

---

## 5. Iconografia

**Regra absoluta: nenhum emoji em nenhuma parte da interface.** Todos os ícones são SVG inline, `stroke="currentColor"`, `fill="none"` (exceto quando o ícone representa um estado "preenchido", como favorito ativo ou play).

| Ícone | Onde | Estilo |
|---|---|---|
| Bookmark | Status "Quero assistir" | stroke, 15×15 dentro da pill |
| Círculo + play | Status "Assistindo" | stroke no círculo, play preenchido (`fill: currentColor`) |
| Círculo + check | Status "Assistido" | stroke |
| Círculo + X | Status "Abandonei" | stroke |
| Coração | Favorito | stroke; quando ativo, `fill: var(--gold)` + `stroke: var(--gold)` |
| Claquete (retângulo + dentes) | Placeholder de pôster (sem imagem carregada) | stroke `var(--line)`, vira `var(--gold)` no hover do card |

Especificação técnica: `stroke-width: 2` para ícones de pill (15–17px), `stroke-width: 1.6` para o ícone de pôster (34px). Todo ícone herda cor via `currentColor` — nunca cor fixa embutida no SVG.

Estrelas de avaliação (`★`/`☆`) são tratadas como glifo tipográfico, não ícone — cor `--gold` quando preenchida, `--line` quando vazia.

---

## 6. Componentes

### 6.1 Botão primário (`.btn`)
Fundo `--gold`, texto escuro (`#1a1508` — nunca branco sobre dourado), sem borda, `border-radius: 8px`, peso 600, padding `11px 16px`.

### 6.2 Botão secundário / ghost (`.btn.ghost`)
Fundo transparente, borda `1px solid var(--line)`, texto `--text`.

### 6.3 Pill de status
Ver seção 3 e 5. Layout: `display: inline-flex`, `gap: 7px` entre ícone e label, padding `8px 13px`.

### 6.4 Input / Textarea
Fundo `--bg2`, borda `1px solid var(--line)`, `border-radius: 8px`, padding `10px 12px`. Foco: `outline: 2px solid var(--gold)`, offset `1px` (acessibilidade de teclado obrigatória).

### 6.5 Card de filme (catálogo/favoritos)
Pôster (2/3) + título (0.85rem/600) + ano (`--muted`) + estrelas. Hover: borda do pôster muda para `--gold`.

### 6.6 Card de detalhe do filme
Layout de duas colunas: pôster fixo (150px) + metadados. Gêneros como tags `--teal`. Sinopse em `#cfcdc6`, largura máx. 60ch.

### 6.7 Item de resenha / feed
Cabeçalho com nome do usuário (peso 600) + timestamp relativo (`--muted`), estrelas, texto do corpo em `#cfcdc6`. Spoiler: tag `--danger` clicável que remove `filter: blur(4px)` do texto ao clique.

### 6.8 Avatar
Círculo com inicial do nome, fundo `--card`, borda `1px solid var(--line)` (feed) ou `2px solid var(--gold)` (perfil próprio), fonte Fraunces no perfil.

### 6.9 Estatística (perfil)
Número grande em Fraunces + `--gold`, label pequeno abaixo em `--muted` uppercase-free (sentence case, sem caixa alta).

---

## 7. Movimento

Apenas uma transição no sistema: fade + slide-up sutil (`opacity 0→1`, `translateY(4px→0)`, `0.25s ease`) ao trocar de tela/view. Sem hover-transitions decorativas em cada card, sem animações de entrada em cascata.

---

## 8. Voz e microcopy

- Botões descrevem a ação em português direto: "Publicar avaliação", "Excluir minha crítica", "Entrar", "Criar conta" — nunca "Enviar" genérico.
- Estados vazios e erros devem explicar o que aconteceu e o que fazer, na voz da interface (não implementados no protótipo — obrigatório na implementação real).
- Nada em caixa alta como recurso decorativo; nenhum rótulo tipo "eyebrow" acima de título.

---

## 9. Regras de conformidade (para o Antigravity)

Ao gerar qualquer componente ou tela do CineStars, o Antigravity deve:
1. Usar exclusivamente as variáveis de cor da seção 1 (via CSS custom properties equivalentes) — nunca hexadecimais soltos no código.
2. Usar Fraunces apenas para identidade/headings; Inter para tudo o mais.
3. Nunca renderizar emoji — todo ícone é SVG de contorno seguindo a seção 5.
4. Seguir a escala de raio de borda por contexto (seção 3) — não aplicar um raio único global.
5. Reservar `--gold` para destaque interativo/ativo; não usar como cor de fundo de bloco grande.
6. Manter o padrão de pill/card/input descrito na seção 6 em qualquer tela nova (ex.: se novas telas forem adicionadas além das 5 do protótipo — cadastro, catálogo, detalhes, feed, perfil).
