# Relatório de Auditoria — Backend CineStars
Data: 2026-09-27
Escopo: Arquitetura e código (segurança excluída — ver seção "Observado, fora de escopo")

---

## 1. Resumo Executivo

Esta auditoria avaliou o backend do **CineStars** sob a perspectiva de engenharia pragmática para a entrega de um MVP robusto (clone do Letterboxd), cobrindo: (A) a conformidade estrita com os contratos e regras de negócio de `CineStars_Backend_Requisitos.md`, e (B) a saúde arquitetural do código no padrão de monólito modular (*vertical slices*).

O núcleo funcional do sistema encontra-se bem estruturado, performático e com testes verdes: resolução transparente de identificadores de filmes (`id_filme` natural ou `sk_movie_id`), login híbrido via SQL `or_()`, corte de 72 bytes no bcrypt, upsert semântico de status e reviews, auto-watched ("regra Letterboxd"), escala de notas em meias estrelas (0.5 a 5.0) e agregações eficientes de perfil em consultas O(1). A coexistência do catálogo analítico original (*Star Schema* com `Dim`/`Fact`) com as tabelas transacionais sociais (`users`, `user_movie_tracking`, `user_reviews`) é coerente com a proposta híbrida da plataforma.

Foram identificados **13 achados técnicos concretos**, categorizados por severidade:
- **2 🔴 Críticos**: busca de filmes com escape de curingas quebrado no SQLite por ausência de `escape="\\"` no SQLAlchemy; e dependências vitais de runtime (`bcrypt`, `pyjwt`, `email-validator`) omitidas no `pyproject.toml`.
- **3 🟠 Altos**: ausência de migração Alembic para o índice `ix_user_reviews_created_at` (detectado por `alembic check`); rotas CRUD de filmes não homologadas e expostas sem autenticação em `/movies`; e rota destrutiva não homologada `DELETE /movies/{id}/status`.
- **5 🟡 Médios**: schemas e funções órfãs sem uso em rotas ativas, duplicação literal de classe de exceção e método utilitário de resolução de filmes, e retorno desprovido de metadados de filme na estante do usuário.
- **3 ⚪ Baixos**: exportação morta de alias de router, divergência de nomenclatura de paginação (`page_size` vs `per_page`) e conflito de configuração do pytest.

---

## 2. Conformidade com o Contrato da API

Confronto com a **Matriz de Contratos** (Seção 3) do documento de requisitos:

| Método | Rota | Conforme? | Observação |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/auth/register` | **Sim** | Implementado em `app/users/router.py:30`. Retorna `201 Created` e `UserResponse` sem vazar credenciais. Unicidade de email/nickname retorna `409 Conflict`. |
| `POST` | `/api/v1/auth/login` | **Sim** | Implementado em `app/users/router.py:41`. Login híbrido funcional (email ou nickname), retorna `200 OK` com `TokenResponse` (`access_token`, `token_type: "bearer"`). Falha retorna `401`. |
| `GET` | `/api/v1/auth/me` | **Sim** | Implementado em `app/users/router.py:52`. Rota autenticada via `get_current_user` retornando dados do usuário com `UserResponse`. |
| `GET` | `/api/v1/users/{nickname}` | **Sim** | Implementado em `app/users/router.py:58`. Endpoint público que consolida perfil, estatísticas e favoritos em `UserProfileResponse`. Retorna `404` se o usuário não existir. |
| `GET` | `/api/v1/feed` | **Sim** | Implementado em `app/reviews/router.py:31`. Rota pública com paginação (`page`, `per_page` máx 50), ordenação cronológica decrescente e campo computado `total_pages`. |
| `GET` | `/api/v1/movies` | **Parcial** | Implementado em `app/movies/router.py:14`. Paginação e carregamento de gêneros conformes, mas o filtro `search` falha no SQLite ao buscar termos com `%` ou `_` por omissão de `escape="\\"` no método `.ilike()` (`app/movies/repository.py:39`). |
| `GET` | `/api/v1/movies/{id}` | **Sim** | Implementado em `app/movies/router.py:46`. Resolução transparente de ID (natural ou surrogate) com pré-carregamento de gêneros e elenco (`DimPerson`). Retorna `404` via `MovieNotFoundError`. |
| `PUT` | `/api/v1/movies/{id}/status` | **Sim** | Implementado em `app/tracking/router.py:30`. Autenticado. Realiza upsert semântico sem duplicar registros e suporta remoção segura de status enviando `"status": null` mantendo `is_favorite`. |
| `GET` | `/api/v1/movies/{id}/my-status` | **Sim** | Implementado em `app/tracking/router.py:40`. Autenticado. Devolve o status e favorito do usuário ativo para o filme ou `null`. |
| `GET` | `/api/v1/movies/me/library` | **Parcial** | Implementado em `app/tracking/router.py:20`. Autenticado e filtrável por status, porém retorna apenas registros de tracking (`MovieTrackingResponse`) sem join com `DimMovie` (título, pôster). |
| `POST` | `/api/v1/movies/{id}/reviews` | **Sim** | Implementado em `app/reviews/router.py:40`. Autenticado. Valida notas de 0.5 a 5.0 em passos de 0.5 (`422` para inválidas), realiza upsert semântico e marca automaticamente o filme como `ASSISTIDO`. |
| `GET` | `/api/v1/movies/{id}/reviews` | **Sim** | Implementado em `app/reviews/router.py:51`. Rota pública paginada com nota média da comunidade (`average_community_rating`). |
| `GET` | `/api/v1/movies/{id}/reviews/me` | **Sim** | Implementado em `app/reviews/router.py:62`. Autenticado. Retorna a review do usuário ativo para o filme ou `null`. |
| `DELETE` | `/api/v1/movies/{id}/reviews` | **Sim** | Implementado em `app/reviews/router.py:72`. Autenticado. Retorna `204 No Content` em sucesso e `404 Not Found` caso a review não exista. |
| `POST` | `/api/v1/movies` | **Não** | Rota fora da especificação em `app/movies/router.py:34`. Permite inserção de filmes no catálogo sem qualquer autenticação. |
| `PATCH` | `/api/v1/movies/{id}` | **Não** | Rota fora da especificação em `app/movies/router.py:56`. Permite edição de filmes sem autenticação. |
| `DELETE` | `/api/v1/movies/{id}` | **Não** | Rota fora da especificação em `app/movies/router.py:67`. Permite exclusão de filmes sem autenticação. |
| `DELETE` | `/api/v1/movies/{id}/status` | **Não** | Rota fora da especificação em `app/tracking/router.py:49`. Deleta fisicamente o registro de tracking, apagando indevidamente a marcação de favorito. |

---

## 3. Checklist de Regras de Negócio (Seção 2.2 do brief)

| # | Regra | Status | Arquivo:Linha | Evidência |
| :-: | :--- | :---: | :--- | :--- |
| 1 | Resolução transparente de ID (`id_filme` natural OU `sk_movie_id` SHA-256) em **todos** os endpoints de filme | **OK** | `app/movies/repository.py:56-60`<br>`app/tracking/service.py:18`<br>`app/reviews/service.py:31` | `or_(DimMovie.sk_movie_id == movie_id, DimMovie.id_filme == movie_id)` aplicado no repositório base consumido por todos os módulos. |
| 2 | Login híbrido: campo `login` aceita email OU nickname via `or_()` | **OK** | `app/users/repository.py:32-35` | `stmt = select(User).where(or_(User.email == identifier, User.nickname == identifier))`. Testado em `tests/test_auth.py:40-65`. |
| 3 | Hash de senha via bcrypt com corte estrito de 72 bytes antes do hashing | **OK** | `app/core/security.py:13,21` | Truncamento implementado em runtime: `password.encode("utf-8")[:72]` tanto no hashing quanto na verificação de senha. |
| 4 | Unicidade de `email` e `nickname` retornando `409 Conflict` | **OK** | `app/users/service.py:12-23`<br>`app/users/router.py:37-38` | `UserAlreadyExistsError` capturado no router e convertido em `HTTPException(status_code=409)`. Testado em `tests/test_auth.py:25-37`. |
| 5 | Busca de filmes com escape de curingas `_` e `%` no `search` | **Falha** | `app/movies/repository.py:33-40` | O código executa `.replace("%", r"\%").replace("_", r"\_")`, mas passa a string para `DimMovie.titulo.ilike(f"%{escaped_search}%")` sem `escape="\\"`. No SQLite, sem o parâmetro `escape`, a contrabarra é tratada como caractere literal e não caractere de escape, quebrando buscas reais com `%` ou `_`. |
| 6 | Paginação com defaults e máximos corretos (max 100 em `/movies`, max 50 em `/feed`), e `total_pages` computado (com teto) | **OK** | `app/movies/router.py:16-17`<br>`app/reviews/router.py:33-34`<br>`app/movies/schemas.py:93-95`<br>`app/reviews/schemas.py:77-79` | `Query(20, ge=1, le=100)` para movies e `Query(20, ge=1, le=50)` para feed. Ambas utilizam `@computed_field` com `math.ceil` calculando o total de páginas. |
| 7 | Eager loading real (sem consultas N+1) nos endpoints de listagem (`/movies`, `/feed`, `/users/{nickname}`) | **OK** | `app/movies/repository.py:23-48`<br>`app/reviews/models.py:58-59`<br>`app/users/repository.py:53-120` | `/movies` utiliza `selectinload` para `genres` e `reviews_summary`. `/feed` utiliza relacionamentos mapeados com `lazy="selectin"`. Perfil público consolida métricas e resenhas em queries O(1). |
| 8 | **Regra Letterboxd (auto-watched):** `POST /movies/{id}/reviews` marca automaticamente `status = ASSISTIDO` na tabela de tracking | **OK** | `app/reviews/service.py:41-46` | `await self.tracking_repository.upsert(..., {"status": MovieWatchStatus.ASSISTIDO})` executado na mesma sessão transacional da criação/edição da review. Testado em `tests/test_reviews.py:8-35`. |
| 9 | **Upsert semântico:** `PUT /status` e `POST /reviews` nunca duplicam registros de um mesmo usuário para o filme | **OK** | `app/tracking/repository.py:43-61`<br>`app/reviews/repository.py:75-93` | Ambos repositórios verificam o par `(user_id, movie_id)` e atualizam a linha existente via `flush()`. Garantido por constraints únicas no banco (`uq_user_movie_tracking` e `uq_user_movie_review`). |
| 10 | **Remoção segura de status:** enviar `"status": null` limpa o status sem apagar `is_favorite` | **OK** | `app/tracking/repository.py:54-57`<br>`app/tracking/service.py:30` | `data.model_dump(exclude_unset=True)` inclui chaves recebidas com `None`. O repositório atualiza `tracking.status = None` mas preserva `tracking.is_favorite` caso não tenha sido enviado. |
| 11 | **Validação de nota:** `rating` entre 0.5 e 5.0 em passos de 0.5 (`(rating * 2) % 1 == 0`), retornando `422` para inválidos | **OK** | `app/reviews/schemas.py:16-26` | Validação via `Field(..., ge=0.5, le=5.0)` e `field_validator` checando `(v * 2) % 1 != 0`. Retorna `422 Unprocessable Entity` nativo do Pydantic. |
| 12 | `DELETE /movies/{id}/reviews`: retorna `204` em sucesso e `404` se a review não existir | **OK** | `app/reviews/router.py:72-79`<br>`app/reviews/service.py:88-92`<br>`app/main.py:43-48` | `service.delete_review` levanta `ReviewNotFoundError` caso a linha não exista, interceptado centralmente pelo exception handler retornando status `404`. Testado em `tests/test_reviews.py:54-76`. |
| 13 | Agregações condicionais do perfil público calculadas em uma única query SQL com `func.count(case(...))` | **OK** | `app/users/repository.py:56-65` | `tracking_stmt = select(func.count(case((UserMovieTracking.status == ..., 1))), ...)`. Todos os status consolidados em uma única consulta. |
| 14 | `LIMIT 4` (favoritos) e `LIMIT 5` (últimas resenhas) no perfil público, ordenados do mais recente primeiro | **OK** | `app/users/repository.py:94,106` | Favoritos ordenados por `UserMovieTracking.updated_at.desc()` com `limit=4`. Reviews ordenadas por `UserReview.created_at.desc()` com `limit=5`. |
| 15 | `GET /users/{nickname}` retorna `404` centralizado quando não existe e não requer autenticação | **OK** | `app/users/router.py:58-66`<br>`app/users/service.py:36` | Rota pública sem guard de autenticação. Levanta `UserNotFoundError` tratado como `404`. |

---

## 4. Achados — Código Morto e Resíduos de Desenvolvimento

1. **Schema órfão `ReviewResponse` em `app/movies/schemas.py`**
   - **Arquivo:Linha**: `app/movies/schemas.py:20-28`
   - **Severidade**: 🟡 Média
   - **Descrição**: Schema Pydantic `ReviewResponse` com campos da base histórica CSV (`sk_movie_review_id`, `nome`, `nota`, `comentario`, `created_at`). Não é importado nem retornado por nenhuma rota ativa do backend e gera ambiguidade com o schema homônimo de `app/reviews/schemas.py:29`.
   - **Recomendação**: Excluir a classe `ReviewResponse` de `app/movies/schemas.py`.

2. **Dependência de autenticação administrativa sem rota associada**
   - **Arquivo:Linha**: `app/users/dependencies.py:39-46`
   - **Severidade**: 🟡 Média
   - **Descrição**: A função assíncrona `require_admin` bloqueia rotas quando `not current_user.is_admin`. Não existe nenhum endpoint no projeto que utilize essa dependência.
   - **Recomendação**: Remover a função ou arquivá-la até que rotas administrativas sejam incluídas no escopo.

3. **Duplicação literal da classe `UserNotFoundError`**
   - **Arquivo:Linha**: `app/users/exceptions.py:11-16`
   - **Severidade**: 🟡 Média
   - **Descrição**: A classe `UserNotFoundError` é declarada na linha 11 com docstring explicativa e imediatamente redeclarada na linha 15 sem corpo, sobrescrevendo a definição anterior no módulo.
   - **Recomendação**: Remover as linhas 15 e 16 de `app/users/exceptions.py`.

4. **Atribuição morta de router em `app/users/router.py`**
   - **Arquivo:Linha**: `app/users/router.py:69`
   - **Severidade**: ⚪ Baixa
   - **Descrição**: Linha final `router = auth_router`. O ponto central de montagem de rotas (`app/api/v1/router.py:6`) importa explicitamente `auth_router` e `users_router`, tornando a variável `router` um resíduo sem uso.
   - **Recomendação**: Remover a linha 69 de `app/users/router.py`.

---

## 5. Avaliação Arquitetural Ampla (Frente B, independente da especificação)

Análise focada em engenharia prática e manutenibilidade para o monólito modular:

### 5.1. Camadas e Responsabilidades
- **Inconsistência na estratégia de captura de exceções**: Enquanto `MovieNotFoundError` e `ReviewNotFoundError` propagam do serviço diretamente para o exception handler global em `app/main.py:42-48`, as rotas de usuários em `app/users/router.py:35, 46, 63` utilizam blocos `try/except` locais para converter erros de domínio em `HTTPException`.
  - *Arquivo:Linha*: `app/users/router.py:35-38, 46-49, 63-66` vs `app/main.py:42-48` | **Severidade: 🟡 Média** | *Recomendação*: Padronizar o tratamento de erros registrando `UserAlreadyExistsError`, `InvalidCredentialsError` e `UserNotFoundError` no handler global de `main.py`.

### 5.2. Design de Banco de Dados
- **Índice de ordenação do feed ausente no Alembic (`alembic check` falha)**: O modelo `UserReview` declara `index=True` na coluna `created_at` (`app/reviews/models.py:49`), mas a migração correspondente `migrations/versions/b4145534d023_create_user_reviews_table.py` não incluiu o índice `ix_user_reviews_created_at`. O comando de validação do Alembic acusa divergência:
  ```text
  FAILED: New upgrade operations detected: [('add_index', Index('ix_user_reviews_created_at', Column('created_at', ...)))]
  ```
  Isso deixa a ordenação do feed (`GET /api/v1/feed` com `created_at DESC`) sem o índice B-Tree em banco gerado via migration.
  - *Arquivo:Linha*: `app/reviews/models.py:49` e `migrations/versions/b4145534d023_create_user_reviews_table.py:38-41` | **Severidade: 🟠 Alta** | *Recomendação*: Gerar e aplicar revisão do Alembic para criar o índice `ix_user_reviews_created_at`.

### 5.3. Configuração e Gestão de Dependências
- **Dependências essenciais de runtime ausentes no `pyproject.toml`**: As bibliotecas `bcrypt` (hashing de senha), `pyjwt` (geração e validação de tokens JWT) e `email-validator` (validação de `EmailStr` no Pydantic) são importadas ativamente pelo backend, mas NÃO estão declaradas na seção `dependencies` do `pyproject.toml`. Uma instalação a partir do zero (`pip install -e .`) falha em runtime com `ModuleNotFoundError`.
  - *Arquivo:Linha*: `pyproject.toml:6-14` | **Severidade: 🔴 Crítica** | *Recomendação*: Adicionar `"bcrypt>=4.0.0"`, `"pyjwt>=2.8.0"` e `"email-validator>=2.0.0"` na lista de dependências do `pyproject.toml`.
- **Conflito de arquivos de configuração do pytest**: O arquivo `pytest.ini` e o arquivo `pyproject.toml` definem configurações redundantes para o runner de testes, provocando aviso contínuo na execução: `WARNING: ignoring pytest config in pyproject.toml!`.
  - *Arquivo:Linha*: `pytest.ini:1-4` vs `pyproject.toml:31-33` | **Severidade: ⚪ Baixa** | *Recomendação*: Remover o arquivo `pytest.ini` e manter a configuração do pytest unificada no `pyproject.toml`.

### 5.4. Convenções de API
- **Inconsistência de nomenclatura no parâmetro de paginação**: O catálogo geral (`/movies`) utiliza `page_size`, enquanto o feed (`/feed`) e as avaliações (`/movies/{id}/reviews`) utilizam `per_page`. Além disso, o schema `MovieReviewListResponse` não disponibiliza a propriedade computada `total_pages` presente nas outras respostas paginadas.
  - *Arquivo:Linha*: `app/movies/router.py:17` vs `app/reviews/router.py:34, 55` e `app/reviews/schemas.py:42-48` | **Severidade: ⚪ Baixa** | *Recomendação*: Uniformizar para `per_page` ou `page_size` e adicionar `@computed_field total_pages` em `MovieReviewListResponse`.

### 5.5. Duplicação de Código
- **Duplicação do método `_get_movie_or_fail` entre serviços**: As classes `TrackingService` e `ReviewService` implementam exatamente o mesmo método utilitário para validar e carregar o filme por identificador:
  ```python
  async def _get_movie_or_fail(self, movie_id: str) -> DimMovie:
      movie = await self.movie_repository.get_by_id(movie_id)
      if movie is None:
          raise MovieNotFoundError(movie_id)
      return movie
  ```
  - *Arquivo:Linha*: `app/tracking/service.py:16-21` e `app/reviews/service.py:30-35` | **Severidade: 🟡 Média** | *Recomendação*: Reaproveitar o método público já existente `MovieService.get_movie_by_id`.

---

## 6. Achados — Consistência Arquitetural (vs. o descrito na especificação)

1. **Rotas CRUD de filmes desprotegidas e fora da especificação**
   - **Arquivo:Linha**: `app/movies/router.py:34-43, 56-66, 67-75`
   - **Severidade**: 🟠 Alta
   - **Descrição**: A especificação estabelece que o catálogo de filmes é read-only para usuários comuns, expondo apenas `GET /api/v1/movies` e `GET /api/v1/movies/{id}`. O arquivo `router.py` contém rotas `POST /movies` (criação), `PATCH /movies/{id}` (edição) e `DELETE /movies/{id}` (exclusão) que não possuem autenticação (`current_user` não é injetado), permitindo manipulação anônima do catálogo.
   - **Recomendação*: Remover as três rotas não especificadas do roteador de filmes.

2. **Rota destrutiva não homologada `DELETE /movies/{id}/status`**
   - **Arquivo:Linha**: `app/tracking/router.py:49-55`
   - **Severidade**: 🟠 Alta
   - **Descrição**: O documento de requisitos (Seção 2.5) define que a remoção de status deve ocorrer via `PUT /api/v1/movies/{id}/status` com `"status": null`, preservando a marcação de favorito (`is_favorite`). A rota `DELETE /movies/{id}/status` deleta a tupla física do banco via `session.delete()`, apagando indevidamente o status de favorito do usuário.
   - **Recomendação**: Remover a rota `DELETE /movies/{id}/status`.

3. **Biblioteca pessoal sem dados de exibição do filme**
   - **Arquivo:Linha**: `app/tracking/router.py:20-28` e `app/tracking/schemas.py:11-17`
   - **Severidade**: 🟡 Média
   - **Descrição**: O endpoint `GET /api/v1/movies/me/library` retorna uma lista simples de `MovieTrackingResponse` contendo apenas `movie_id`, `status` e `is_favorite`. Para renderizar a estante no frontend conforme a especificação, são necessários título, pôster e ano do filme, o que atualmente exigiria N requisições adicionais a `GET /movies/{id}`.
   - **Recomendação**: Enriquecer o schema de resposta com os metadados básicos do filme via join com `DimMovie`.

---

## 7. Achados — Qualidade Geral

1. **Falha de escape de curingas SQL no SQLite (`app/movies/repository.py`)**
   - **Arquivo:Linha**: `app/movies/repository.py:33-40`
   - **Severidade**: 🔴 Crítica
   - **Descrição**: O repositório substitui `%` por `\%` e `_` por `\_`, mas invoca `DimMovie.titulo.ilike(f"%{escaped_search}%")` sem passar `escape="\\"`. No dialeto SQLite, o operador `LIKE` não adota a contrabarra como caractere de escape por padrão. Em consequência, o banco busca a contrabarra literal seguida do caractere curinga, fazendo buscas com `%` ou `_` falharem em retornar os registros corretos.
   - **Recomendação**: Informar o caractere de escape explicitamente no SQLAlchemy: `DimMovie.titulo.ilike(f"%{escaped_search}%", escape="\\\\")`.

---

## 8. Observado, fora de escopo (segurança)

Anotações rápidas conforme Seção 3 do brief:
- Chave de assinatura JWT de fallback com apenas 20 bytes (`secret_key = "vou-preencher-depois"`), provocando aviso de segurança do PyJWT (`app/core/config.py:18`).
- Ausência da variável `SECRET_KEY` no arquivo `.env.example`.
- Rotas mutáveis de catálogo de filmes expostas sem autenticação (`app/movies/router.py:34, 56, 67`).
- Ausência de rate limiting nas rotas de autenticação (`/auth/login`, `/auth/register`).

---

## 9. Itens Não Verificáveis

Todos os itens do brief de auditoria foram verificados e validados diretamente no código-fonte e na suíte de testes existente. Não há pendências não verificáveis no ambiente inspecionado.
