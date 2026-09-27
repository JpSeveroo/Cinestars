# 05 - Roteiro de Implementação e Milestones de Entrega (Frontend CineStars)
**Versão:** 1.0.0  
**Ambiente Alvo:** Web SPA (Frontend CineStars)  
**Documentos de Apoio Mandatórios:**  
- `01_TECH_STACK_AND_CONVENTIONS.md` (Stack, estrutura de pastas e anti-padrões)  
- `02_DESIGN_SYSTEM_AND_TOKENS.md` (Paleta, tipografia e componentes visuais)  
- `03_API_CONTRACTS_AND_STATE.md` (Contratos de endpoints, DTOs e regras de cache)  
- `04_PAGES_AND_USER_FLOWS.md` (Mapeamento de telas, estados de interface e regras de negócio)

---

## 1. Diretrizes de Execução para o Agente Autônomo

Para garantir consistência, ausência de bugs e fidelidade absoluta aos contratos da API, o agente deve seguir rigorosamente as regras abaixo:

1. **Execução Estritamente Sequencial:** Implemente um milestone por vez. Não avance para o próximo milestone sem validar todos os critérios de aceite do anterior.
2. **Checagem de Tipagem Contínua:** Ao final de cada milestone, execute `npx tsc --noEmit` para garantir zero erros de compilação TypeScript.
3. **Respeito aos Contratos:** Utilize estritamente os campos definidos no `03_API_CONTRACTS_AND_STATE.md` (ex: `sk_movie_id`, `url_poster`, `ano_lancamento`). Não crie nomes alternativos no client-side.
4. **Isolamento de Estado:** Não salve listas do catálogo ou dados de reviews no Zustand. Estado de servidor pertence exclusivamente ao TanStack Query.

---

## 2. Roteiro de Milestones

```text
[Milestone 1: Fundação & Layout Shell]
          │
          ▼
[Milestone 2: Rede, Auth & Sessão]
          │
          ▼
[Milestone 3: Catálogo, Busca & Componentes Nucleares]
          │
          ▼
[Milestone 4: Detalhes do Filme, Tracking & Avaliações]
          │
          ▼
[Milestone 5: Estante Pessoal & Perfil Público]
          │
          ▼
[Milestone 6: Home Feed, Toasts, QA & Build Final]
```

---

### MILESTONE 1: Fundação do Projeto, Design Tokens e Layout Shell
**Foco:** Configuração base da SPA, infraestrutura de estilos e esqueleto estrutural de navegação.

#### Tarefas:
- [ ] Inicializar o projeto com Vite + React + TypeScript seguindo o `01_TECH_STACK_AND_CONVENTIONS.md`.
- [ ] Configurar o Tailwind CSS com os tokens e paleta escura do `02_DESIGN_SYSTEM_AND_TOKENS.md` (fundo `#14181c`, superfícies `#1e242b`, acentos verdes e texto secundário `#9ab0c0`).
- [ ] Configurar o alias `@/` no `tsconfig.json` e `vite.config.ts`.
- [ ] Criar a estrutura base de diretórios (`components/`, `lib/`, `pages/`, `types/`, `store/`, `hooks/`).
- [ ] Criar primitivas de UI desacopladas em `src/components/ui/`:
  - `Button.tsx` (variantes: primary, outline, ghost, danger).
  - `Input.tsx` (suporte a ícone, foco com ring âmbar/verde, mensagens de erro).
  - `Badge.tsx` (gêneros e status).
  - `Skeleton.tsx` (animação pulsante suave para tema escuro).
- [ ] Implementar a casca da aplicação (`src/components/layout/`):
  - `Navbar.tsx` (logo CineStars, links de navegação, botão de login/avatar placeholder).
  - `Footer.tsx` (identidade visual, links e créditos).
  - `Layout.tsx` (Navbar fixa/topo + container principal com `Outlet` + Footer).
- [ ] Configurar o React Router inicial com rotas em branco para todas as páginas mapeadas no `04_PAGES_AND_USER_FLOWS.md`.

#### Critérios de Aceite:
* Aplicação sobe localmente sem warnings (`npm run dev`).
* O layout renderiza Navbar, conteúdo dinâmico e Footer na paleta correta.
* Navegação entre rotas vazias funciona sem recarregar a página.

---

### MILESTONE 2: Camada de Rede, Autenticação e Sessão
**Foco:** Conexão com o backend FastAPI, persistência de JWT e fluxos completos de login e cadastro.

#### Tarefas:
- [ ] Criar o arquivo `.env` baseado no `.env.example` apontando para `VITE_API_BASE_URL=http://localhost:8000/api/v1`.
- [ ] Criar `src/lib/api.ts` com a instância do Axios, interceptor de Bearer Token e interceptor de erro `401` com logout automático.
- [ ] Criar as interfaces em `src/types/auth.ts` e `src/types/common.ts`.
- [ ] Implementar a store Zustand em `src/store/authStore.ts` com persistência no `localStorage`.
- [ ] Criar o componente de proteção de rotas `src/routes/ProtectedRoute.tsx`.
- [ ] Implementar `src/pages/LoginPage.tsx`:
  - Formulário com `react-hook-form` + `zod`.
  - Campo único de login híbrido (`identifier`: nickname ou e-mail).
  - Consumo de `POST /auth/login`.
  - Armazenamento do token e redirecionamento para a rota anterior ou `/`.
- [ ] Implementar `src/pages/RegisterPage.tsx`:
  - Validação estrita de nickname, email, senha e campos opcionais (`avatar_url`, `bio`).
  - Consumo de `POST /auth/register`.
  - Tratamento amigável de erro `409 Conflict` (e-mail ou nickname duplicado).
- [ ] Atualizar `Navbar.tsx` para reagir ao estado de autenticação:
  - Exibir botões "Entrar" e "Cadastrar" se anônimo.
  - Exibir avatar, nickname e menu dropdown com botão "Sair" se autenticado.

#### Critérios de Aceite:
* Usuário consegue criar uma conta nova e receber feedback em caso de dados duplicados.
* Usuário consegue fazer login tanto com e-mail quanto com nickname.
* F5 na página preserva a sessão do usuário através do `localStorage`.
* Botão "Sair" limpa os dados e redireciona para a tela inicial.

---

### MILESTONE 3: Catálogo de Filmes, Busca e Componentes Nucleares
**Foco:** Listagem performática de filmes com debounce na busca, filtros por gênero e paginação.

#### Tarefas:
- [ ] Criar interfaces em `src/types/movie.ts` e a factory `src/lib/queryKeys.ts`.
- [ ] Implementar o hook `useDebounce.ts` para delay de 400ms em campos de busca.
- [ ] Implementar o componente `MovieCard.tsx` (`src/components/shared/`):
  - Proporção visual padrão `2:3`.
  - Efeito suave de hover (zoom e elevação).
  - Tratamento de imagem com fallback caso `url_poster` seja nulo ou quebrado.
  - Exibição de título, ano de lançamento e nota média da comunidade.
- [ ] Implementar o componente `StarRating.tsx` (modo somente leitura com suporte a meias estrelas).
- [ ] Implementar `src/pages/CatalogPage.tsx`:
  - Consumo de `GET /movies` via TanStack Query (`useQuery`).
  - Barra superior de pesquisa conectada ao `useDebounce`.
  - Filtro por pílulas ou dropdown de gêneros cinematográficos.
  - Grid responsivo de filmes (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6`).
  - Paginação completa (botões "Anterior", indicador numérico de páginas e "Próxima").
  - Estado de carregamento com grade de `Skeleton` no tamanho exato dos cards.
  - Estado vazio para buscas sem resultado.

#### Critérios de Aceite:
* O catálogo renderiza os filmes vindos do banco local do backend.
* Digitar no campo de busca aguarda 400ms antes de disparar uma única requisição.
* Paginação troca de página, atualiza os dados e rola a tela para o topo.

---

### MILESTONE 4: Detalhes do Filme, Tracking e Avaliações (Letterboxd Core)
**Foco:** Ficha técnica detalhada, marcação de status na estante e publicação de reviews com a regra Auto-Watched.

#### Tarefas:
- [ ] Criar interfaces em `src/types/tracking.ts` e `src/types/review.ts`.
- [ ] Atualizar `StarRating.tsx` para suportar modo interativo (hover e seleção de meias estrelas de 0.5 a 5.0).
- [ ] Implementar o componente `TrackingActions.tsx`:
  - Botão de alternar status `ASSISTIDO`.
  - Botão de alternar status `QUERO_ASSISTIR`.
  - Botão de alternar `is_favorite` (coração/favorito).
  - Consumo de `GET /movies/{id}/tracking` e `PUT /movies/{id}/tracking`.
- [ ] Implementar o componente `ReviewModal.tsx`:
  - Seletor de nota de 0.5 a 5.0 estrelas.
  - Campo de texto para resenha opcional.
  - Aviso visual explícito sobre a regra Auto-Watched.
  - Consumo de `POST /movies/{id}/reviews`.
- [ ] Implementar `src/pages/MovieDetailPage.tsx`:
  - Consumo de `GET /movies/{id}`.
  - Backdrop com imagem e gradiente para o fundo escuro.
  - Pôster em destaque, metadados (ano, duração, gêneros) e sinopse completa.
  - Seção da média de avaliações da comunidade.
  - Painel lateral/superior com o `TrackingActions`.
  - Lista paginada das avaliações do filme (`GET /movies/{id}/reviews`).
- [ ] Configurar a invalidação de cache no TanStack Query conforme a seção 6 do `03_API_CONTRACTS_AND_STATE.md` (garantindo que criar uma avaliação atualize imediatamente o status de tracking e a média da nota).

#### Critérios de Aceite:
* Usuário deslogado vê a ficha técnica e reviews, mas é convidado a logar para interagir.
* Usuário logado consegue alterar status entre "Quero Assistir" e "Assistido" com feedback instantâneo.
* Publicar uma review fecha o modal, exibe toast de confirmação e marca o filme automaticamente como "Assistido".

---

### MILESTONE 5: Estante Pessoal (Library) e Perfil Social do Usuário
**Foco:** Visualização organizada do acervo pessoal e tela de perfil com métricas agregadas em $O(1)$.

#### Tarefas:
- [ ] Criar interfaces em `src/types/profile.ts`.
- [ ] Implementar `src/pages/LibraryPage.tsx` (Rota Protegida):
  - Navegação por abas: "Todos", "Assistidos", "Quero Assistir", "Assistindo", "Abandonados", "Favoritos".
  - Consumo de `GET /movies/me/library` passando parâmetros de query (`status`, `is_favorite`, `page`).
  - Cards de filme enriquecidos exibindo badges de status sobrepostos ao pôster.
  - Opção rápida para alterar status ou remover item da estante (`DELETE /movies/{id}/tracking`).
  - Empty state personalizado para cada aba sem filmes.
- [ ] Implementar `src/pages/ProfilePage.tsx` (`/users/:nickname`):
  - Consumo de `GET /users/{nickname}`.
  - Header com avatar grande, nickname, biografia e data de cadastro.
  - Grid de estatísticas $O(1)$ com 4 contadores: Total Assistidos, Total Reviews, Quero Assistir e Favoritos.
  - Seção vitrine "Top 4 Filmes Favoritos" com os pôsteres destacados.
  - Seção com as 5 resenhas mais recentes publicadas pelo usuário.
  - Tratamento visual de erro 404 caso o nickname não exista.

#### Critérios de Aceite:
* `/library` só pode ser acessada por usuários autenticados.
* Alternar abas na biblioteca filtra instantaneamente os filmes com paginação correta.
* `/users/:nickname` exibe as estatísticas reais calculadas pelo backend sem discrepâncias.

---

### MILESTONE 6: Home Page (Feed Comunitário), Toasts, QA e Build Final
**Foco:** Tela inicial engajadora, refinamento visual, tratamento global de exceções e validação de produção.

#### Tarefas:
- [ ] Implementar `src/pages/HomePage.tsx`:
  - Banner promocional Hero com CTAs direcionando para catálogo ou cadastro (esconder CTAs para logados).
  - Grade horizontal com 6 filmes populares do catálogo.
  - Timeline da comunidade: listagem paginada consumindo `GET /reviews/community/feed`.
  - Cards do feed com avatar do autor, pôster do filme, título, estrelas, texto da resenha e tempo decorrido.
- [ ] Configurar o componente global de notificações `<Toaster richColors position="bottom-right" />` do Sonner no `App.tsx`.
- [ ] Criar página genérica de `NotFoundPage.tsx` (404) para rotas inexistentes.
- [ ] Auditoria de Qualidade e Anti-Overengineering:
  - Verificar se nenhuma requisição direta via `fetch()` solta foi deixada nos componentes.
  - Verificar se nenhum dado analítico foi indevidamente acoplado ao Zustand.
  - Testar fluxos de erro (backend offline, credenciais inválidas, buscas sem match).
- [ ] Executar checagem de tipos e build estático:
  ```bash
  npx tsc --noEmit
  npm run build
  ```

#### Critérios de Aceite:
* O feed comunitário da Home atualiza e pagina corretamente.
* Toasts aparecem em todas as mutações com cores e textos semânticos.
* O build de produção executa com sucesso (`dist/` gerado sem nenhum erro de tipagem).