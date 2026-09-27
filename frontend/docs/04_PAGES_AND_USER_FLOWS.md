# 04 - Telas, Fluxos de Usuário e Comportamentos de Interface
**Versão:** 1.0.0  
**Ambiente Alvo:** Web SPA (Frontend CineStars)  
**Dependências de Contrato:** `03_API_CONTRACTS_AND_STATE.md`  
**Referência Visual:** `02_DESIGN_SYSTEM_AND_TOKENS.md`

---

## 1. Visão Geral e Diretrizes de Navegação

Este documento mapeia todas as telas da aplicação, suas rotas no `React Router`, os componentes estruturais necessários, as chamadas de API correspondentes e o tratamento de estados de interface (Loading, Empty, Error).

### Regras Mandatórias de Interface:
1. **Feedback Visual Imediato:** Ações de tracking (marcar assistido, favoritar) e avaliações devem disparar feedback visual (via Sonner Toasts e invalidação imediata de cache).
2. **Debounce em Buscas:** O campo de pesquisa no catálogo nunca deve disparar requisições a cada caractere; implementar obrigatoriamente um debounce de **400ms**.
3. **Skeleton Loading:** Nenhuma tela deve apresentar telas brancas ou "pulos" de layout (*Cumulative Layout Shift*). Enquanto o TanStack Query estiver em `isLoading`, renderizar placeholders estruturais com a proporção exata dos cards (`2:3` para pôsteres).
4. **Proteção de Rotas:** Telas privadas (`/library`, submissão de reviews) devem checar o `isAuthenticated` do `authStore`. Usuários não logados devem ser redirecionados para `/login` preservando a intenção de navegação (`state.from`).

---

## 2. Mapa de Rotas da Aplicação

| Rota | Componente de Página | Acesso | Descrição |
| :--- | :--- | :---: | :--- |
| `/` | `HomePage.tsx` | Público | Hero promocional, feed global de reviews e novidades. |
| `/movies` | `CatalogPage.tsx` | Público | Grid de filmes, busca com debounce, filtros e paginação. |
| `/movies/:id` | `MovieDetailPage.tsx` | Público | Detalhes do filme, ficha técnica, tracking bar e reviews. |
| `/library` | `LibraryPage.tsx` | Privado | Estante pessoal do usuário com abas por status e favoritos. |
| `/users/:nickname` | `ProfilePage.tsx` | Público | Perfil público com métricas O(1), Top 4 e histórico. |
| `/login` | `LoginPage.tsx` | Visitante | Formulário de autenticação híbrida (e-mail ou nickname). |
| `/register` | `RegisterPage.tsx` | Visitante | Cadastro de novo usuário cinéfilo. |

---

## 3. Especificação Detalhada das Telas

### 3.1. Home Page (`/`) — Feed Comunitário e Boas-Vindas
* **Objetivo:** Engajar o usuário com a atividade recente da comunidade de cinéfilos e apresentar os filmes em destaque.
* **Consumo de API:**
  * `GET /reviews/community/feed?page=1&page_size=10`
  * `GET /movies?page=1&page_size=6` (para carrossel/grid de filmes em destaque)
* **Estrutura da Tela:**
  1. **Hero Section:** Banner cinematográfico de boas-vindas com chamada para ação (CTA): "Registre o que assistiu. Compartilhe sua paixão." com botões para `/register` ou `/movies`. (Ocultar CTA se o usuário já estiver logado).
  2. **Grid de Destaques:** Linha horizontal com 6 pôsteres de filmes populares/recentes.
  3. **Feed da Comunidade (Timeline Letterboxd):**
     * Lista vertical de cards de avaliação.
     * Cada card deve exibir: Avatar e Nickname do autor, pôster mini do filme, título do filme, ano, classificação em estrelas (ex: ★★★★½), texto da resenha e tempo decorrido relativo (ex: "há 2 horas").
     * Paginação com botão "Carregar mais reviews" usando TanStack Query.
* **Estados da Interface:**
  * *Skeleton:* 6 placeholders retangulares no destaque + 3 cards vazios no feed.
  * *Empty State:* "Nenhuma avaliação recente na comunidade. Seja o primeiro a avaliar!"

---

### 3.2. Catálogo & Busca (`/movies`) — Exploração Paginada
* **Objetivo:** Permitir busca ágil e filtragem do acervo de filmes.
* **Consumo de API:**
  * `GET /movies?page={page}&page_size=18&search={debouncedSearch}&genre={selectedGenre}`
* **Estrutura da Tela:**
  1. **Barra de Controle Superior:**
     * Campo de busca com ícone de lupa e limpeza rápida (`X`).
     * Seletor de Gênero (dropdown ou pílulas horizontais: Ação, Drama, Ficção Científica, Comédia, Terror, etc.).
     * Contador textual: "Exibindo X de Y filmes".
  2. **Grid de Filmes:**
     * Grade responsiva de cards (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4`).
     * Card do filme: Pôster em proporção `2:3`, cantos arredondados, efeito sutil de zoom no hover, título em 1 linha (com reticências se longo), ano de lançamento e nota média destacada em âmbar.
  3. **Barra de Paginação:**
     * Botões "Anterior", indicador numérico de "Página X de Y" e "Próxima".
     * Rolar automaticamente para o topo da lista ao mudar de página.
* **Estados da Interface:**
  * *Debounce:* Delay de 400ms no input de texto antes de disparar o fetch.
  * *Empty State:* Se a busca não retornar filmes: "Nenhum filme encontrado para '[termo]'. Tente outro título ou limpe o filtro."

---

### 3.3. Detalhes do Filme (`/movies/:id`) — Ficha e Interatividade
* **Objetivo:** Exibir dados completos do filme, permitir ações rápidas de tracking e gerenciar avaliações.
* **Consumo de API:**
  * `GET /movies/{id}` (Metadados do filme)
  * `GET /movies/{id}/tracking` (Status do usuário logado para este filme)
  * `GET /movies/{id}/reviews?page=1&page_size=5` (Resenhas da comunidade para este filme)
* **Estrutura da Tela:**
  1. **Cabeçalho com Backdrop:** Imagem de fundo escurecida com gradiente suave para a cor de fundo `#14181c`.
  2. **Coluna Principal (Ficha Técnica):**
     * Pôster em alta resolução (tamanho médio/grande).
     * Título principal com ano entre parênteses: *Ex: Interstellar (2014)*.
     * Metadados em linha: Duração (ex: "169 min"), Gêneros em badges (ex: `Ficção Científica`, `Drama`).
     * Sinopse completa.
     * Média da Comunidade: Placar em destaque com estrelas e contagem total de votos.
  3. **Painel de Ações do Usuário (`TrackingActions`):**
     * *Se Deslogado:* Card convidativo com botão "Faça login para avaliar ou marcar como assistido".
     * *Se Logado:*
       * **Botão Assistido:** Alterna status entre `ASSISTIDO` e neutro.
       * **Botão Quero Assistir:** Alterna status entre `QUERO_ASSISTIR` e neutro.
       * **Botão Favorito:** Alterna `is_favorite` (ícone de coração ou estrela especial).
       * **Botão "Avaliar ou Escrever Review":** Abre o `ReviewModal`.
  4. **Seção de Reviews da Comunidade:**
     * Listagem paginada das avaliações exclusivas deste filme.
     * Botão para abrir o modal de escrita caso o usuário ainda não tenha avaliado.

---

### 3.4. Modal de Avaliação (`ReviewModal.tsx`)
* **Gatilho de Abertura:** Botão "Avaliar" na página do filme ou no card da biblioteca.
* **Consumo de API:**
  * `POST /movies/{id}/reviews` (criação)
  * `PUT /reviews/{review_id}` (edição, se o usuário já tiver avaliado)
* **Estrutura do Modal:**
  1. Título: "Avaliar [Nome do Filme]".
  2. **Controle Interativo de Estrelas (`StarRating.tsx`):**
     * Suporte estrito a **meias estrelas** (0.5 a 5.0).
     * Hover dinâmico: passar o mouse na metade esquerda de uma estrela preenche meia estrela; na metade direita, a estrela inteira.
     * Indicador textual numérico ao lado (ex: "4.5 / 5.0").
  3. **Área de Texto (Resenha Opcional):**
     * Textarea para a crítica cinematográfica (máximo recomendado: 2000 caracteres).
  4. **Aviso de Efeito Colateral:**
     * Nota em texto discreto: *"Publicar uma avaliação marcará este filme automaticamente como assistido na sua estante."*
  5. **Ações:** Botão "Cancelar" e Botão "Salvar Avaliação".
* **Comportamento Pós-Sucesso:**
  * Fechar o modal imediatamente.
  * Disparar Toast via Sonner: *"Sua avaliação foi publicada!"*.
  * Invalidar o cache das queries de reviews, tracking e dados do filme.

---

### 3.5. Biblioteca Pessoal (`/library`) — Estante do Usuário
* **Acesso:** Rota estritamente protegida (requer login).
* **Consumo de API:**
  * `GET /movies/me/library?status={tabStatus}&is_favorite={isFav}&page={page}&page_size=18`
* **Estrutura da Tela:**
  1. **Header da Biblioteca:** Título "Minha Estante" e contador de itens.
  2. **Abas de Navegação (Tabs):**
     * **Todos** (sem filtro de status)
     * **Assistidos** (`status=ASSISTIDO`)
     * **Quero Assistir** (`status=QUERO_ASSISTIR`)
     * **Assistindo** (`status=ASSISTINDO`)
     * **Abandonados** (`status=ABANDONEI`)
     * **Favoritos** (`is_favorite=true`)
  3. **Grid de Filmes da Estante:**
     * Cards no mesmo formato visual do catálogo, mas exibindo badges discretos sobrepostos ao pôster:
       * Ícone de "Assistido" (verde).
       * Ícone de "Coração" (se favoritado).
     * Menu de contexto rápido (3 pontinhos ou hover com ações) permitindo alterar o status ou remover do tracking (`DELETE /movies/{id}/tracking`).
* **Estados da Interface:**
  * *Empty State Personalizado:* Se a aba selecionada estiver vazia: "Você ainda não adicionou nenhum filme nesta categoria. Explore o catálogo para montar sua estante!" com botão para `/movies`.

---

### 3.6. Perfil do Usuário (`/users/:nickname`) — Vitrine Social
* **Objetivo:** Exibir a identidade cinematográfica de qualquer cinéfilo cadastrado.
* **Consumo de API:**
  * `GET /users/{nickname}`
* **Estrutura da Tela:**
  1. **Header do Perfil:**
     * Avatar grande (com fallback para inicial do nome se `avatar_url` for nulo).
     * Nickname em destaque com data de entrada (ex: "Membro desde Fevereiro de 2026").
     * Bio do usuário.
  2. **Barra de Métricas O(1) (Estatísticas Agregadas):**
     * Grid com 4 contadores destacados:
       * **Filmes Assistidos** (`stats.total_watched`)
       * **Resenhas Escritas** (`stats.total_reviews`)
       * **Quero Assistir** (`stats.total_want_to_watch`)
       * **Favoritos** (`stats.total_favorites`)
  3. **Vitrine dos 4 Filmes Favoritos ("Top 4 Favoritos"):**
     * Linha de destaque com exatamente 4 pôsteres selecionados pelo usuário.
     * Caso o usuário tenha menos de 4, exibir slots vazios com borda tracejada convidando à seleção (se for o próprio dono do perfil).
  4. **Últimas Avaliações:**
     * Lista com as 5 resenhas mais recentes do usuário com notas e datas.
* **Tratamento de 404:**
  * Se o `nickname` não existir no banco: exibir tela amigável de "Usuário não encontrado" com botão para voltar ao início.

---

### 3.7. Telas de Autenticação (`/login` e `/register`)
* **Design:** Layout focado, limpo, centralizado na tela sobre fundo escuro elegante.

#### Login (`/login`)
* **Campos:**
  1. `identifier` (Input único que aceita tanto e-mail quanto nickname).
  2. `password` (Input com botão para alternar visualização de senha).
* **Validação (Zod):** Ambos os campos obrigatórios.
* **Comportamento Pós-Sucesso:**
  * Salvar `access_token` e `user` no Zustand (`authStore`).
  * Toast de boas-vindas: *"Bem-vindo de volta, [nickname]!"*.
  * Redirecionar para a rota de onde ele veio (`state.from`) ou para `/`.

#### Cadastro (`/register`)
* **Campos:**
  1. `nickname` (mínimo 3 caracteres, sem espaços).
  2. `email` (e-mail válido).
  3. `password` (mínimo 6 caracteres).
  4. `avatar_url` (opcional, URL válida de imagem).
  5. `bio` (opcional, texto descritivo curto).
* **Tratamento de Conflito (409 Conflict):**
  * Se o e-mail ou nickname já existirem, exibir a mensagem devolvida pelo backend exatamente abaixo do campo correspondente ou via Toast.

---

## 4. Matriz de Componentes Compartilhados Críticos

O agente deve obrigatoriamente construir estes componentes com alto nível de reuso:

1. **`MovieCard.tsx` (`src/components/shared/MovieCard.tsx`)**:
   * Aceita tanto `MovieCardItem` quanto `TrackingMovieCard`.
   * Proporção `aspect-[2/3]`, imagem com `object-cover` e tratamento de fallback caso a imagem falhe (`onError`).
   * Tooltip ou texto no rodapé com título e ano.
2. **`StarRating.tsx` (`src/components/shared/StarRating.tsx`)**:
   * Props: `rating: number`, `maxRating?: number`, `interactive?: boolean`, `onChange?: (newRating: number) => void`.
   * Renderiza estrelas cheias, meias estrelas e estrelas vazias com precisão matemática.
3. **`Navbar.tsx` (`src/components/layout/Navbar.tsx`)**:
   * Logo CineStars à esquerda linkando para `/`.
   * Links centrais: "Catálogo" (`/movies`) e "Estante" (`/library`).
   * Lado direito:
     * *Se anônimo:* Botões "Entrar" e "Cadastrar".
     * *Se autenticado:* Avatar clicável com menu dropdown ("Meu Perfil", "Minha Estante", separador, "Sair").