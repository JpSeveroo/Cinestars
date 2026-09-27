# Documento de Especificação de Requisitos e Contratos (CineStars Backend)

Este documento especifica os requisitos funcionais, regras de negócio e interfaces implementadas no backend do **CineStars**, correlacionando cada recurso da API com as respectivas telas e componentes da interface (cuja renderização visual e validações de cliente ficam a cargo do Frontend).

## 1. Visão Geral e Padrões de Domínio

- **Arquitetura Base:** Vertical slices orientadas a features (`users`, `movies`, `tracking`, `reviews`).

- **Base URL da API:** `[http://127.0.0.1:8000/api/v1](http://127.0.0.1:8000/api/v1)`

- **Padrão de Autenticação:** Bearer Token JWT (Algoritmo `HS256`, expiração padrão em dias, chave simétrica de 256 bits).

- **Resolução Transparente de IDs:** Todos os endpoints que recebem identificadores de filmes aceitam tanto o `id_filme` natural/amigável (ex: `"1227249"`) quanto a chave substituta interna (`sk_movie_id` SHA-256).   

- **Tratamento de Exceções:** Respostas de erro padronizadas em RFC HTTP (`400`, `401`, `404`, `409`, `422`) contendo o payload `{"detail": "mensagem descritiva"}`.




## 2. Especificação Funcional por Telas

### 2.1. Tela de Cadastro (`/register`)

#### A Cargo do Frontend

- Campo de confirmação de senha ("Confirmar Senha") e validação de igualdade no cliente.   

- Checkbox de aceite de termos de privacidade e confirmação de idade (+16 anos).   

- Bloqueio inicial de submissão para senhas com menos de 6 caracteres ou mais de 72 bytes.




#### Responsabilidade do Backend (Implementado)

- **Endpoint:** `POST /api/v1/auth/register`

- **Contrato de Entrada:** `UserCreate` (`email`, `nickname`, `password`, `avatar_url` opcional, `bio` opcional).

- **Regras de Negócio e Validações:**

  - Validação RFC de formato de email (`EmailStr`).

  - `nickname` restrito a `^[a-zA-Z0-9_-]+$`, tamanho de 3 a 50 caracteres.

  - Hashing via `bcrypt` nativo com corte de segurança estrito de 72 bytes.

  - Unicidade de `email` e `nickname`: retorna `409 Conflict` caso já existam no banco.

  - O payload de retorno (`UserResponse`) **nunca** expõe senhas ou hashes criptográficos.




### 2.2. Tela de Login (`/login`)

#### A Cargo do Frontend

- Máscara visual do campo de senha (ocultar/revelar senha).

- Armazenamento seguro do `access_token` retornado (`localStorage`, `sessionStorage` ou `HttpOnly cookie`).

- Redirecionamento automático pós-login para o catálogo ou feed.




#### Responsabilidade do Backend (Implementado)

- **Endpoint:** `POST /api/v1/auth/login`

- **Contrato de Entrada:** `UserLogin` (`login`, `password`).

- **Regras de Negócio:**

  - **Login Híbrido:** O campo `login` aceita indistintamente o `email` ou o `nickname` do cinéfilo via cláusula SQL `or_()`.

  - Validação da senha contra o hash criptográfico.

  - Retorno `401 Unauthorized` para credenciais incorretas ou inexistentes.

  - Retorno `200 OK` acompanhado de `{"access_token": "...", "token_type": "bearer"}`.




### 2.3. Aba de Catálogo / Filmes (`/movies`)

#### A Cargo do Frontend

- Componentes de card com renderização de pôster, título, ano, gêneros e nota média formatada em estrelas.   

- Barra de pesquisa com técnica de *debounce* (aguardar digitação antes de chamar a API).

- Paginação visual (botões de página anterior/próxima ou scroll infinito) baseada em `page` e `total_pages`.




#### Responsabilidade do Backend (Implementado)

- **Endpoint:** `GET /api/v1/movies`

- **Parâmetros de Consulta:**

  - `page` (int, default 1)

  - `page_size` (int, default 20, max 100)

  - `search` (string opcional, busca por título com escape de caracteres curinga `_` e `%`)




- **Regras de Negócio:**

  - Ordenação padrão: filmes mais recentes primeiro (`ano_lancamento.desc()`), com desempate por ordem alfabética.   

  - Eager loading otimizado de gêneros (`DimGenre`) e resumo analítico de métricas (`DimReview`), sem problema de consultas N+1.   

  - Resposta paginada contendo `items`, `total`, `page`, `page_size` e o campo computado `total_pages`.




### 2.4. Tela de Detalhes do Filme (`/movies/{id}`)

#### A Cargo do Frontend

- Banner principal com imagem de *backdrop* e pôster lado a lado.   

- Seção de sinopse, ano, duração em minutos e gêneros.   

- Listagem horizontal de elenco e direção.   

- Abas ou seções para: status atual do usuário logado, botão para avaliar e críticas da comunidade.   




#### Responsabilidade do Backend (Implementado)

- **Endpoints:**

  - `GET /api/v1/movies/{id}` (Detalhes gerais, metadados, pessoas e gêneros)   

  - `GET /api/v1/movies/{id}/reviews` (Lista paginada de reviews públicas com nota média da comunidade)

  - `GET /api/v1/movies/{id}/my-status` (Consulta autenticada do status e favorito do usuário ativo)

  - `GET /api/v1/movies/{id}/reviews/me` (Consulta autenticada da review publicada pelo próprio usuário)




- **Regras de Negócio:**

  - Resolução transparente do ID (aceita identificador natural ou surrogate hash).

  - Retorno `404 Not Found` caso o filme não exista.




### 2.5. Modais de Ação: Tracking & Criação de Review

#### A Cargo do Frontend

- Modal ou seletor de status com botões visuais interativos:

  - 📌 Quero assistir (`QUERO_ASSISTIR`)   

  - ▶️ Assistindo (`ASSISTINDO`)   

  - ✅ Assistido (`ASSISTIDO`)   

  - ❌ Abandonei (`ABANDONEI`)   

  - Botão de Favoritar (toggle booleano ❤️)




- Componente de avaliação interativo: escala visual de 0.5 a 5.0 estrelas (permitindo meias estrelas).   

- Checkbox para marcação de "Contém Spoilers".

- Botão de exclusão da própria resenha existente.




#### Responsabilidade do Backend (Implementado)

- **Endpoints:**

  - `PUT /api/v1/movies/{id}/status`

  - `POST /api/v1/movies/{id}/reviews`

  - `DELETE /api/v1/movies/{id}/reviews`




- **Regras de Negócio:**

  - **Upsert Semântico:** Atualizar o status ou a review não cria registros duplicados; atualiza a linha existente do usuário para aquele filme.

  - **Regra Letterboxd (Auto-Watched):** Ao publicar ou alterar uma review via `POST /reviews`, o backend marca o filme automaticamente como `status = ASSISTIDO` na tabela de tracking.

  - **Validação de Estrelas:** A nota deve estar rigorosamente entre `0.5` e `5.0`, com passos obrigatórios de `0.5` (`(rating * 2) % 1 == 0`). Notas fora do padrão (ex: `4.3`) retornam `422 Unprocessable Content`.

  - **Remoção Segura de Status:** Enviar `"status": null` no payload de tracking limpa o status de visualização mantendo a marcação de favorito intacta.

  - A deleção de review responde com `204 No Content` e retorna `404 Not Found` se o usuário tentar deletar uma review inexistente.




### 2.6. Aba de Feed Global da Comunidade (`/feed`)

#### A Cargo do Frontend

- Exibição em linha do tempo (timeline) das atividades recentes da rede.

- Cards exibindo: avatar e nickname do autor, miniatura do pôster do filme, nota em estrelas, aviso de spoiler (com texto oculto sob clique) e data relativa (ex: "há 2 horas").

- Scroll infinito acionando novas páginas do feed.




#### Responsabilidade do Backend (Implementado)

- **Endpoint:** `GET /api/v1/feed`

- **Parâmetros de Consulta:** `page` (default 1), `per_page` (default 20, max 50).

- **Regras de Negócio:**

  - Ordenação cronológica estrita por `created_at DESC` utilizando índice em banco B-Tree.

  - Carregamento em lote (*eager loading* via `selectin`) das entidades associadas `User` e `DimMovie`, garantindo custo estável $O(1)$ de queries.

  - Resposta serializada com `items`, `total`, `page`, `per_page` e `@computed_field total_pages`.




### 2.7. Aba de Perfil Público (`/users/{nickname}`)

#### A Cargo do Frontend

- Header do perfil com avatar, nickname, biografia e data de entrada na plataforma.   

- Painel de métricas consolidado com contadores em destaque.   

- Grid "Top 4 Favoritos" destacado em estilo Letterboxd.   

- Lista com as últimas resenhas textuais escritas pelo usuário.   

- Exibição de tela de "Usuário não encontrado" em caso de retorno `404`.




#### Responsabilidade do Backend (Implementado)

- **Endpoint:** `GET /api/v1/users/{nickname}` (Público, sem necessidade de autenticação).

- **Regras de Negócio:**

  - **Agregação Condicional em Banco:** Os contadores de tracking (`ASSISTIDO`, `QUERO_ASSISTIR`, `ASSISTINDO`, `ABANDONEI`) são calculados em uma única query SQL usando `func.count(case(...))`.   

  - Contagem total de resenhas e cálculo de nota média histórica do cinéfilo calculadas na query de reviews.   

  - Consulta dedicada com `LIMIT 4` para os filmes favoritados mais recentes.   

  - Consulta dedicada com `LIMIT 5` das últimas resenhas com dados dos filmes pré-carregados.   

  - Retorno `404 Not Found` disparado centralmente caso o nickname não exista.




### 2.8. Rodapé e Páginas Institucionais

#### A Cargo do Frontend

- Todos os links de rodapé: Termos de Uso, Ajuda/FAQ, Sobre, Política de Privacidade, Copyright "© CineStars — 2026" e links externos para redes sociais/portfólio.   

- Não há necessidade de endpoints dinâmicos no backend; trata-se de conteúdo puramente estático de interface.   




## 3. Matriz de Contratos de API (Referência de Integração)

| **Método** | **Rota**                         | **Autenticado** | **Descrição do Recurso**          | **Payload de Entrada (JSON)**                              |      |
| ---------- | -------------------------------- | --------------- | --------------------------------- | ---------------------------------------------------------- | ---- |
| `POST`     | `/api/v1/auth/register`          | Não             | Cadastro de nova conta            | `{"email", "nickname", "password", "avatar_url"?, "bio"?}` |      |
| `POST`     | `/api/v1/auth/login`             | Não             | Autenticação (Email ou Nick)      | `{"login", "password"}`                                    |      |
| `GET`      | `/api/v1/auth/me`                | Sim             | Dados da conta logada             | *Nenhum*                                                   |      |
| `GET`      | `/api/v1/users/{nickname}`       | Não             | Perfil público e estatísticas     | *Nenhum*                                                   |      |
| `GET`      | `/api/v1/feed`                   | Não             | Feed global da comunidade         | *Query params: `page`, `per_page`*                         |      |
| `GET`      | `/api/v1/movies`                 | Não             | Catálogo geral com busca          | *Query params: `page`, `page_size`, `search`*<br>          | <br> |
| `GET`      | `/api/v1/movies/{id}`            | Não             | Detalhes completos do filme       | *Nenhum*<br>                                               | <br> |
| `PUT`      | `/api/v1/movies/{id}/status`     | Sim             | Atualiza status / favorito        | `{"status"?: "ASSISTIDO"\|null, "is_favorite"?: true}`     |      |
| `GET`      | `/api/v1/movies/{id}/my-status`  | Sim             | Consulta status do usuário        | *Nenhum*                                                   |      |
| `GET`      | `/api/v1/movies/me/library`      | Sim             | Biblioteca pessoal filtrada       | *Query param: `status`*                                    |      |
| `POST`     | `/api/v1/movies/{id}/reviews`    | Sim             | Publica/Edita avaliação           | `{"rating": 4.5, "review_text"?, "has_spoilers": false}`   |      |
| `GET`      | `/api/v1/movies/{id}/reviews`    | Não             | Críticas públicas do filme        | *Query params: `page`, `per_page`*                         |      |
| `GET`      | `/api/v1/movies/{id}/reviews/me` | Sim             | Crítica do próprio usuário logado | *Nenhum*                                                   |      |
| `DELETE`   | `/api/v1/movies/{id}/reviews`    | Sim             | Remove a crítica do filme         | *Nenhum*                                                   |      |

## 4. Decisões Arquiteturais e Itens Descartados / Ajustados

Durante o desenvolvimento e refinamento da arquitetura técnica, os seguintes itens do rascunho inicial foram modificados ou removidos:

1. **Remoção de Listas Personalizadas (*****User Custom Lists*****):**

   - *Decisão:* Descartadas para a entrega do MVP. O foco foi direcionado para consolidar com excelência a biblioteca de 4 status (`QUERO_ASSISTIR`, `ASSISTINDO`, `ASSISTIDO`, `ABANDONEI`), os favoritos e as resenhas.




2. **Filtro por Serviços de Streaming ("Onde assistir"):**

   - *Decisão:* Removido do escopo do backend. O conjunto de dados original de filmes não possui mapeamento relacional confiável de catálogo de streaming por país, tornando inviável manter esses dados sem serviços externos de terceiros.   




3. **Escala de Avaliação de 0 a 10 $\rightarrow$ Ajustada para Escala Letterboxd:**

   - *Decisão:* O rascunho anterior mencionava notas genéricas. A especificação final foi padronizada na escala Letterboxd: **0.5 a 5.0 estrelas** em passos de **0.5**, refletida com validação matemática no backend.   




4. **Login Exclusivo por Nickname $\rightarrow$ Ajustado para Login Híbrido:**

   - *Decisão:* O rascunho previa login apenas por nickname. Foi implementado o padrão híbrido (`email` ou `nickname`), elevando a usabilidade da aplicação.   




5. **Verificações de Termos e Idade Mínima:**

   - *Decisão:* Tratadas exclusivamente como validações de formulário do Frontend, mantendo o payload da API focado em dados de persistência de identidade.   