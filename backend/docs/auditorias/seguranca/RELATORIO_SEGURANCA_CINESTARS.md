# Relatório de Auditoria — Segurança e Prontidão Operacional (Backend CineStars)
Data: 2026-09-27

---

## 1. Resumo Executivo

Esta auditoria técnica avaliou o backend do **CineStars** em duas frentes mandatórias de engenharia:
1. **Frente A (Segurança)**: Análise estática, verificação de postura criptográfica, auditoria de repositório, validação de limites de entrada e execução de testes automatizados de controle de acesso e IDOR (*Insecure Direct Object References*).
2. **Frente B (Prontidão Operacional)**: Avaliação da reprodutibilidade do setup a partir do zero (*"casa pronta"*), mapeamento exaustivo de variáveis de ambiente, rastreabilidade dos artefatos de dados e identificação das lacunas operacionais para a elaboração do README definitivo.

### Postura Geral de Segurança
O núcleo transacional do sistema apresenta sólida consistência em autorização: **nenhum vetor de IDOR foi confirmado**. Todas as operações mutáveis de tracking (`PUT /movies/{id}/status`), resenhas (`POST /movies/{id}/reviews`, `DELETE /movies/{id}/reviews`) e consultas autenticadas de estante (`GET /movies/me/library`, `GET /movies/{id}/my-status`, `GET /movies/{id}/reviews/me`) amarram a identidade estritamente ao identificador contido no *subject* do JWT validado (`current_user.id`), rejeitando com sucesso qualquer tentativa de injeção de `user_id` em payloads. O perfil público (`GET /users/{nickname}`) restringe-se estritamente aos dados definidos na especificação, sem vazamento de emails, senhas ou flags administrativas.

Entretanto, foram identificados pontos críticos de configuração e exposição que demandam remediação prioritária antes do deploy em produção.

### Consolidação dos Achados por Severidade

**Frente A (Segurança):**
- 🔴 **1 Crítico**: Fallback de `SECRET_KEY` hardcoded com valor padrão estático no código versionado.
- 🟠 **1 Alto**: Ausência total de taxa limite (*rate limiting*) e mitigação contra força bruta em endpoints de autenticação.
- 🟡 **3 Médios**: Descompasso de limite de tamanho em schema vs banco para `avatar_url`; ausência de headers de segurança HTTP; e permissividade excessiva em métodos/cabeçalhos de CORS.
- ⚪ **3 Baixos / Informativos**: Ausência de lista de revogação (*blacklist*) para JWT; logging de parâmetros SQL em modo local com exposição de hashes; e health check superficial sem probe de banco.

**Frente B (Prontidão Operacional):**
- 🔴 **2 Bloqueios de Setup**: Acoplamento incondicional a comandos PRAGMA do SQLite impedindo execução em outros bancos (ex: PostgreSQL); e catálogo de filmes vazio após migrations em banco zerado pela necessidade de scripts de seed não documentados.
- 🟡 **3 Fricções / Ambiguidades**: Ausência de lockfile com dependências soltas (`>=` sem teto); ambiguidade de nomenclatura legada ("RocketLab" vs "CineStars"); e pacote órfão instalado no ambiente virtual (`passlib`).
- ⚪ **1 Nice-to-have**: Ausência de arquivo `.python-version` para fixação de versão exata do interpretador.

### Os 3 Riscos Mais Urgentes
1. **Chave Criptográfica JWT Previsível via Fallback no Código (`app/core/config.py:18`)**: A existência de um valor padrão estático para `SECRET_KEY` permite que um invasor assine tokens arbitrários e assuma a identidade de qualquer usuário caso a variável de ambiente seja omitida na esteira de produção.
2. **Exaustão de Recursos e Força Bruta em `/auth/login` e `/auth/register` (`app/users/router.py:30, 41`)**: A ausência de rate limiting expõe o backend a ataques de negação de serviço direcionados à CPU devido ao custo algorítmico do bcrypt (~12 rounds), além de viabilizar ataques de *credential stuffing*.
3. **Impossibilidade de Execução em Banco Relacional de Produção (`app/db/session.py:28`)**: O gatilho de conexão executa `PRAGMA foreign_keys=ON` de forma incondicional, quebrando com erro de sintaxe SQL se o banco de produção for alterado para PostgreSQL ou MySQL.

---

## 2. Autenticação e Gestão de Sessão (JWT)

| Descrição | Arquivo:Linha | Severidade | Recomendação |
| :--- | :--- | :---: | :--- |
| **Fallback inseguro com chave secreta JWT estática no código**: A classe `Settings` define `secret_key` com um valor default textual hardcoded. Se a variável de ambiente `SECRET_KEY` for omitida no servidor de produção, a aplicação sobe silenciosamente utilizando essa chave pública e comprometida, permitindo a forja arbitrária de tokens de autenticação. | `app/core/config.py:18` | 🔴 Crítico | Tornar a variável `secret_key` obrigatória em ambientes que não sejam de desenvolvimento local, disparando exceção no carregamento das configurações: `if settings.environment != "local" and settings.secret_key.startswith("cinestars-dev"): raise ValueError(...)`. |
| **Algoritmo de assinatura estrito (HS256)**: A decodificação de JWT valida explicitamente a lista `algorithms=[settings.algorithm]`, prevenindo vulnerabilidades de `alg=none` ou confusão de chaves assimétricas. Testes automatizados confirmaram a rejeição de tokens não assinados ou com algoritmos adulterados. | `app/users/dependencies.py:25`<br>`app/core/config.py:19` | 🟢 Conforme | Manter a verificação estrita parametrizada via lista fechada de algoritmos. |
| **Expiração de token razoável e validada**: Os tokens contêm as claims `exp` e `iat`, com tempo de vida padrão de 24 horas (`60 * 24` minutos). A expiração é exigida e validada nativamente pelo PyJWT em todas as rotas protegidas. | `app/core/security.py:31-36`<br>`app/users/dependencies.py:25-30` | 🟢 Conforme | Manter o ciclo de vida atual; avaliar implementação futura de refresh token rotativo para encurtar a vida do access token para 15 a 60 minutos. |
| **Ausência de mecanismo de revogação/blacklist de tokens**: Os tokens JWT são puramente *stateless*. Uma vez emitidos, permanecem válidos até o término do tempo de expiração (`exp`), não existindo invalidação imediata em caso de logout, alteração de senha ou encerramento preventivo de sessão. | `app/users/dependencies.py:15-36` | ⚪ Baixo / Informativo | Documentar a decisão arquitetural; para fases futuras, incluir coluna de controle de versão de token (`token_version`) no modelo `User` ou lista de revogação em memória/Redis. |
| **Hashing de credenciais robusto via bcrypt nativo**: O corte estrito de 72 bytes em `password.encode("utf-8")[:72]` é aplicado antes do hashing e da verificação. O custo padrão da biblioteca (`rounds=12`) é mantido sem atenuações para produção, e a comparação é delegada a `bcrypt.checkpw` (tempo constante). | `app/core/security.py:13, 20-23` | 🟢 Conforme | Manter o padrão implementado. |

---

## 3. Autorização e Controle de Acesso (IDOR)

| Descrição | Arquivo:Linha | Severidade | Recomendação |
| :--- | :--- | :---: | :--- |
| **Escopo estrito em `PUT /movies/{id}/status`**: O endpoint consome exclusivamente a identidade `current_user.id` provida pelo token JWT. Campos adicionais como `user_id` presentes no corpo da requisição são ignorados pelo schema Pydantic `MovieTrackingUpdate`. | `app/tracking/router.py:30-37`<br>`app/tracking/service.py:24-35` | 🟢 Conforme | Manter o desacoplamento de identidade: requisições nunca devem aceitar `user_id` vindo do cliente. |
| **Escopo estrito em `POST /movies/{id}/reviews`**: A criação e atualização de resenha associa obrigatoriamente `user_id = current_user.id`. Tentativas de adulterar a autoria de reviews via injeção de parâmetros no payload são ineficazes. | `app/reviews/router.py:40-48`<br>`app/reviews/service.py:37-54` | 🟢 Conforme | Manter o binding estrito com a sessão autenticada. |
| **Proteção contra deleção de terceiros em `DELETE /movies/{id}/reviews`**: O repositório realiza exclusão filtrando obrigatoriamente por `UserReview.user_id == user_id` e `UserReview.movie_id == movie_id`. Se um usuário tentar deletar a resenha de outro cinéfilo, o sistema não localiza o registro de sua propriedade e responde com `404 Not Found`. | `app/reviews/router.py:72-79`<br>`app/reviews/service.py:88-92`<br>`app/reviews/repository.py:95-101` | 🟢 Conforme | Manter o filtro duplo no repositório. |
| **Isolamento de consultas em `/my-status`, `/reviews/me` e `/me/library`**: Todos os endpoints pessoais utilizam estritamente o `user_id` resolvido na autenticação. Não há caminho para vazamento de dados de outros usuários por manipulação de parâmetros. | `app/tracking/router.py:20-27, 40-46`<br>`app/reviews/router.py:62-69` | 🟢 Conforme | Manter os escopos protegidos por dependência. |
| **Blindagem de dados no perfil público `GET /users/{nickname}`**: O schema `UserProfileResponse` expõe unicamente campos públicos (`id`, `nickname`, `bio`, `avatar_url`, `created_at`, `stats`, `favorites`, `recent_reviews`). Dados sensíveis (`email`, `hashed_password`, `is_admin`) são completamente excluídos do payload de saída. | `app/users/router.py:58-66`<br>`app/users/service.py:42-51`<br>`app/users/schemas.py:73-83` | 🟢 Conforme | Manter schemas de resposta dedicados para perfis públicos, segregados do schema de conta (`UserResponse`). |

### Resultados dos Testes Experimentais de IDOR e Autorização
Para comprovar empiricamente a robustez dos controles de acesso, foi executada uma suíte automatizada de testes temporários contra o ambiente de teste em memória (`sqlite+aiosqlite:///:memory:`):

1. **Teste IDOR em `PUT /movies/{id}/status`**:
   - *Cenário*: Usuário A marca filme como `QUERO_ASSISTIR` e `is_favorite=True`. Usuário B envia payload `{"user_id": "<id_de_A>", "status": "ABANDONEI", "is_favorite": False}` autenticado com token de B.
   - *Resultado*: **OK (Passou)**. O registro de A permaneceu intacto; apenas o registro de B foi criado/alterado como `ABANDONEI`.
2. **Teste IDOR em `POST /movies/{id}/reviews`**:
   - *Cenário*: Usuário A publica resenha com nota 5.0. Usuário B envia `POST /reviews` com `{"user_id": "<id_de_A>", "rating": 1.0, "review_text": "Review maliciosa"}` autenticado com token de B.
   - *Resultado*: **OK (Passou)**. A resenha de A permaneceu inalterada (nota 5.0 e texto original de A); o sistema criou resenha separada de titularidade de B.
3. **Teste IDOR em `DELETE /movies/{id}/reviews`**:
   - *Cenário*: Usuário A possui resenha no filme. Usuário B (sem resenha cadastrada) tenta executar `DELETE /movies/{id}/reviews` para apagar a resenha de A.
   - *Resultado*: **OK (Passou)**. O backend retornou `404 Not Found`; a resenha de A permaneceu cadastrada no banco.
4. **Teste de Vazamento em `GET /my-status` e `GET /reviews/me`**:
   - *Cenário*: Usuário A possui interações com o filme. Usuário B consulta as rotas privadas sem ter interagido previamente.
   - *Resultado*: **OK (Passou)**. O backend retornou `null` (200 OK com payload nulo), sem vazar nenhum dado de A.
5. **Teste de Escopo de Biblioteca `GET /movies/me/library`**:
   - *Cenário*: Usuário A possui 1 filme salvo. Usuário B consulta sua estante.
   - *Resultado*: **OK (Passou)**. Usuário A recebeu lista contendo 1 item; Usuário B recebeu lista vazia `[]`.
6. **Teste de Vazamento em Perfil Público `GET /users/{nickname}`**:
   - *Cenário*: Consulta ao perfil público de usuário cadastrado com email e senha privados.
   - *Resultado*: **OK (Passou)**. Campos `email`, `hashed_password` e `is_admin` não constam na resposta serializada.
7. **Testes de Manipulação de Tokens JWT**:
   - *Cenário A (`alg=none`)*: Token gerado sem assinatura rejeitado com `401 Unauthorized`.
   - *Cenário B (Token Expirado)*: Token com timestamp retroativo rejeitado com `401 Unauthorized`.
   - *Cenário C (Chave Simétrica Incorreta)*: Token assinado com chave externa espúria rejeitado com `401 Unauthorized`.

---

## 4. Validação de Entrada e Injeção

| Descrição | Arquivo:Linha | Severidade | Recomendação |
| :--- | :--- | :---: | :--- |
| **Inexistência de SQL Injection em consultas ORM**: Todo o acesso a dados no projeto é construído exclusivamente por meio de abstrações do SQLAlchemy Core/ORM (`select()`, `where()`, `func`). Não há interpolações com f-strings, queries cruas (`text()`) ou concatenações dinâmicas de comandos SQL. | Todos os repositórios em `app/*/repository.py` | 🟢 Conforme | Manter o padrão de consultas parametrizadas do ORM. |
| **Tratamento seguro de escape no catálogo de filmes**: A pesquisa por título aplica sanitização explícita de caracteres curinga (`\`, `%`, `_`) e passa explicitamente a cláusula `escape="\\"` ao operador `.ilike()`, operando de forma correta e segura em SQLite e motores SQL padrão ANSI. | `app/movies/repository.py:33-41` | 🟢 Conforme | Manter a parametrização com escape de curingas. |
| **Inconsistência de validação de tamanho para `avatar_url`**: O modelo de banco define `String(500)` para a coluna `avatar_url`, mas o schema Pydantic `UserCreate` declara `avatar_url: str | None = None` sem restrição de `max_length`. Payloads contendo strings arbitrárias de dezenas de milhares de caracteres disparam exceções de banco de dados (`DataError` / `StringDataRightTruncation` com código 500) em bancos estritos em vez do status `422 Unprocessable Content`. | `app/users/schemas.py:13` vs `app/users/models.py:34` | 🟡 Média | Adicionar `max_length=500` no campo `avatar_url` do schema `UserCreate` (e preferencialmente validador de URL válida `HttpUrl`). |
| **Limites de entrada estabelecidos para textos livres**: Campos de texto livre possuem tetos estritos definidos no Pydantic: `bio` (`max_length=500`), `review_text` (`max_length=5000`), `nickname` (`min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$"`), protegendo contra sobrecarga de memória no parsing de JSON. | `app/users/schemas.py:11, 14`<br>`app/reviews/schemas.py:18` | 🟢 Conforme | Manter validações de contorno de payload. |
| **Ausência de superfície de SSRF para URLs externas**: O backend armazena `avatar_url`, `url_poster` e `url_backdrop` apenas como metadados textuais passivos. Não há bibliotecas de cliente HTTP ativas (`httpx`, `requests`, `urllib`) executando fetches em runtime. | `app/users/service.py`<br>`app/movies/service.py` | 🟢 Conforme | Manter ausência de fetches no backend; caso haja processamento de imagens no futuro, implementar validação rigorosa de IP e esquema (bloqueando endereços RFC1918 e metadados de nuvem). |

---

## 5. Configuração de Rede (CORS, Rate Limiting, Headers)

| Descrição | Arquivo:Linha | Severidade | Recomendação |
| :--- | :--- | :---: | :--- |
| **Ausência total de Rate Limiting em rotas críticas**: Os endpoints de registro e login (`POST /api/v1/auth/register` e `POST /api/v1/auth/login`) não contam com nenhum limitador de taxa de requisições. Como o cálculo de hashes bcrypt consome deliberadamente ciclos intensivos de CPU, requisições automatizadas em rajada podem degradar o serviço ou permitir ataques de força bruta ilimitados. | `app/users/router.py:30-49` | 🟠 Alta | Implementar middleware de rate limiting (como `slowapi` baseado em token bucket / IP) com limites recomendados de 5 a 10 requisições por minuto por IP para endpoints de autenticação. |
| **Permissividade ampla nos métodos e headers de CORS**: O middleware `CORSMiddleware` está configurado com `allow_credentials=True` em conjunto com `allow_methods=["*"]` e `allow_headers=["*"]`. Embora as origens (`allow_origins`) estejam apontadas para a lista de settings, a abertura total de headers e métodos eleva a superfície de exposição desnecessariamente. | `app/main.py:35-40` | 🟡 Média | Restringir os métodos aos efetivamente consumidos pela API (`allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]`) e cabeçalhos essenciais (`allow_headers=["Authorization", "Content-Type"]`). |
| **Ausência de headers de segurança HTTP (OWASP Secure Headers)**: As respostas da API não incluem os cabeçalhos essenciais recomendados pelas diretrizes de segurança da indústria: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security` e `Referrer-Policy`. | `app/main.py:27-56` | 🟡 Média | Incluir um middleware nativo do Starlette/FastAPI adicionando os cabeçalhos de segurança padrão em todas as respostas HTTP. |

---

## 6. Segredos no Repositório

| Descrição | Arquivo:Linha | Severidade | Recomendação |
| :--- | :--- | :---: | :--- |
| **Chave secreta de desenvolvimento hardcoded no código**: A string de segredo para assinatura de JWTs encontra-se declarada diretamente no código-fonte Python versionado como valor default de `secret_key`. | `app/core/config.py:18` | 🔴 Crítico | Eliminar o default no código para ambientes produtivos ou impedir a inicialização caso o segredo permaneça com a chave de desenvolvimento. |
| **Auditoria do histórico Git para o arquivo `.env`**: A inspeção exaustiva do log Git (`git log --all --full-history`) confirmou que o arquivo `.env` real **nunca foi commitado** em nenhuma branch ou revisão. Apenas o modelo descritivo `.env.example` consta no histórico do repositório. O `.gitignore` tanto na raiz quanto no backend protege satisfatoriamente os padrões `.env`, `*.db`, `*.sqlite3` e pastas virtuais. | `.gitignore:12`<br>`backend/.gitignore:9` | 🟢 Conforme | Manter o `.gitignore` inalterado e adotar ferramentas de pré-commit (*gitleaks* ou *detect-secrets*) no fluxo de desenvolvimento. |
| **Arquivo `.env.example` sanitizado**: O template versionado contém apenas parâmetros genéricos de configuração local e chaves descritivas de teste, sem valores confidenciais reais reaproveitados de ambientes externos. | `backend/.env.example:1-7` | 🟢 Conforme | Manter o arquivo livre de credenciais sensíveis. |
| **Inexistência de credenciais hardcoded em migrations/Alembic**: O arquivo `alembic.ini` e o script `migrations/env.py` não contêm credenciais estáticas de banco de dados; a URL de conexão é extraída dinamicamente via `get_settings().database_url`. | `alembic.ini:5`<br>`migrations/env.py:21-22` | 🟢 Conforme | Manter a obtenção dinâmica de configuração através do módulo de settings. |

---

## 7. Dependências

- **Status da Ferramenta de Auditoria**: **Não verificável diretamente no ambiente**. Nenhuma ferramenta dedicada a varredura de vulnerabilidades de dependências (como `pip-audit`, `safety` ou `trivy`) encontra-se instalada no ambiente virtual local, e as regras estritas da auditoria proíbem a instalação de novos pacotes.
- **Dependências de Runtime em Avaliação** (declaradas em `pyproject.toml:6-17`):
  - `fastapi>=0.115.0`
  - `uvicorn[standard]>=0.32.0`
  - `sqlalchemy>=2.0.35`
  - `aiosqlite>=0.20.0`
  - `pydantic>=2.9.0`
  - `pydantic-settings>=2.5.0`
  - `alembic>=1.19.2`
  - `bcrypt>=4.0.0`
  - `pyjwt>=2.8.0`
  - `email-validator>=2.0.0`
- **Recomendação**: Integrar rotina periódica de `pip-audit` na esteira de CI/CD do GitHub Actions para monitorar CVEs publicadas no ecossistema Python.

---

## 8. Prontidão Operacional

### 8.1. Tabela de Variáveis de Ambiente

Mapeamento de **todas** as variáveis gerenciadas pelo Pydantic Settings (`BaseSettings`) consumidas pela aplicação:

| Variável | Usada em (arquivo:linha) | Documentada em `.env.example`? | Default seguro para produção? | Obrigatória para a aplicação subir? |
| :--- | :--- | :---: | :---: | :---: |
| `PROJECT_NAME` | `app/core/config.py:11`<br>`app/main.py:29` | **Não** | 🟡 Não (Default `"RocketLab API"` é legado e não reflete o nome CineStars) | Não (Default `"RocketLab API"`) |
| `PROJECT_VERSION` | `app/core/config.py:12`<br>`app/main.py:30` | **Sim** | 🟢 Sim (Default `"2026.2"`) | Não (Default `"2026.2"`) |
| `ENVIRONMENT` | `app/core/config.py:13`<br>`app/db/session.py:27` | **Sim** | 🟡 Não (Default `"local"`. Ativa `echo=True` no SQLAlchemy com dump de dados no console. Deve ser `production` em produção) | Não (Default `"local"`) |
| `API_V1_PREFIX` | `app/core/config.py:14`<br>`app/main.py:50`<br>`app/users/dependencies.py:12` | **Não** | 🟢 Sim (Default `"/api/v1"`) | Não (Default `"/api/v1"`) |
| `DATABASE_URL` | `app/core/config.py:15`<br>`app/db/session.py:27`<br>`migrations/env.py:21` | **Sim** | 🔴 Não (Default aponta para SQLite local `./rocketlab.db`. Em produção relacional requer driver como `postgresql+asyncpg://`) | Não (Default local disponível) |
| `BACKEND_CORS_ORIGINS` | `app/core/config.py:16`<br>`app/main.py:36` | **Sim** | 🟡 Não (Default restrito a `["http://localhost:5173"]`. Em produção precisa conter as URLs do frontend publicado) | Não (Default local disponível) |
| `LOG_LEVEL` | `app/core/config.py:17`<br>`app/core/logging.py:11` | **Sim** | 🟢 Sim (Default `"INFO"`) | Não (Default `"INFO"`) |
| `SECRET_KEY` | `app/core/config.py:18`<br>`app/core/security.py:38`<br>`app/users/dependencies.py:25` | **Sim** | 🔴 Não (Default estático fraco/público no código. Deve ser sobrescrita por chave aleatória criptográfica) | Não (Possui fallback no código, criando vulnerabilidade) |
| `ALGORITHM` | `app/core/config.py:19`<br>`app/core/security.py:38`<br>`app/users/dependencies.py:25` | **Não** | 🟢 Sim (Default `"HS256"`) | Não (Default `"HS256"`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `app/core/config.py:20`<br>`app/core/security.py:31` | **Não** | 🟢 Sim (Default `1440` minutos = 24 horas) | Não (Default `1440`) |

### 8.2. Reprodutibilidade do Setup

- **Dependências e Declaração (`pyproject.toml`)**:
  - Todas as bibliotecas importadas pelo código de produção (`bcrypt`, `pyjwt`, `email-validator`, `pydantic-settings`, etc.) encontram-se declaradas na seção `dependencies`.
  - A instalação em modo de desenvolvimento é disparada via `pip install -e ".[dev]"`.
  - **Inexistência de Lockfile**: Não há arquivo de lock no repositório (`poetry.lock`, `uv.lock` ou `requirements.txt` com pins estritos). Todas as dependências utilizam `>=` sem limite superior, o que pode gerar quebra por variações em builds futuros.
- **Migrations e Banco de Dados (`alembic`)**:
  - O comando `alembic upgrade head` cria com sucesso todas as tabelas a partir de uma base vazia.
  - O estado atual das migrações está sincronizado com os modelos SQLAlchemy (`alembic check` reportou conformidade total).
- **Função Real da Pasta `data/`**:
  - As subpastas `data/bases_atv_dev1/` e `data/bases_atv_dev_2/` contêm os arquivos CSV fontes do modelo Star Schema: dimensões (`dim_movies.csv`, `dim_genres.csv`, `dim_people.csv`, `dim_reviews.csv`, `dim_companies.csv`), tabelas associativas/bridge e fatos de performance.
  - **Não são meros rascunhos descartáveis**: servem de insumo direto para popular o catálogo de filmes.
- **Função Real da Pasta `scripts/`**:
  - `scripts/seed1.py`: Povoa o banco com as tabelas de dimensões lendo de `data/bases_atv_dev1/`.
  - `scripts/seed2.py`: Povoa o banco com as tabelas bridge e fatos analíticos lendo de `data/bases_atv_dev_2/`.
  - **Ambos os scripts são passos essenciais de setup**: sem executá-los em um banco recém-criado, a API funcionará mas o catálogo de filmes responderá com lista vazia `{"items": [], "total": 0}`.
- **Incompatibilidade com Bancos de Produção (`app/db/session.py` e `migrations/env.py`)**:
  - Em `app/db/session.py:28`, a rotina `enable_sqlite_foreign_keys` anexa um listener de conexão que executa incondicionalmente o comando SQLite `PRAGMA foreign_keys=ON`. Ao rodar com PostgreSQL, qualquer conexão falha com erro de sintaxe.
  - Em `migrations/env.py:21`, o Alembic substitui apenas `+aiosqlite`. Ao receber uma URL assíncrona do Postgres (`postgresql+asyncpg://`), a substituição não ocorre, provocando falha na execução das migrations.

### 8.3. Lacunas para o Setup Funcionar do Zero

1. 🔴 **Falta de documentação sobre a necessidade de rodar os scripts de seed**: Se um desenvolvedor apenas rodar `alembic upgrade head`, o catálogo de filmes não terá dados. É mandatório documentar a execução sequencial de `seed1.py` e `seed2.py`.
2. 🔴 **Incompatibilidade de drivers caso o banco de dados não seja SQLite**: A aplicação atualmente assume SQLite em runtime em pontos de infraestrutura (`PRAGMA`). Para ambientes de nuvem/produção com PostgreSQL, o código precisa ser condicional ao dialeto antes de subir.
3. 🟡 **Ambiguidade de terminologia "RocketLab" vs "CineStars"**: O banco default é nomeado `rocketlab.db`, o pacote chama `rocketlab-backend` e o projeto `RocketLab API`, gerando confusão no onboarding.
4. 🟡 **Falta de lockfile para congelamento de dependências**: Um setup a partir do zero pode instalar versões conflitantes de submódulos no futuro se não houver um arquivo de lock versionado.
5. 🟡 **Omissão de variáveis de ambiente no `.env.example`**: Variáveis como `PROJECT_NAME`, `API_V1_PREFIX`, `ALGORITHM` e `ACCESS_TOKEN_EXPIRE_MINUTES` não constam no exemplo.

---

## 9. Insumos para o README

Estrutura detalhada e pronta para a confecção do README do repositório:

### 1. Pré-requisitos
- Python 3.11 ou superior (testado e homologado no Python 3.13).
- Git instalado.
- Gerenciador de pacotes `pip` e ferramenta de ambiente virtual (`venv`).

### 2. Instalação Passo a Passo
```bash
# 1. Clonar o repositório e entrar na pasta do backend
git clone <url-do-repositorio>
cd Cinestars/backend

# 2. Criar e ativar o ambiente virtual
python -m venv .venv
# No Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# No Linux/macOS:
source .venv/bin/activate

# 3. Atualizar pip e instalar dependências em modo editável com pacotes de dev
pip install --upgrade pip
pip install -e ".[dev]"
```

### 3. Configuração de Variáveis de Ambiente
Copie o modelo de ambiente:
```bash
cp .env.example .env
```
**Variáveis Obrigatórias vs Opcionais**:
- `SECRET_KEY`: **Obrigatória em produção** (deve ser gerada com `openssl rand -hex 32` com no mínimo 32 bytes). Em ambiente local, um valor padrão de desenvolvimento é aceito pelo Pydantic.
- `DATABASE_URL`: **Opcional em desenvolvimento** (padrão: `sqlite+aiosqlite:///./rocketlab.db`). Em produção, definir a connection string assíncrona (ex: `postgresql+asyncpg://usuario:senha@host:5432/cinestars`).
- `ENVIRONMENT`: **Opcional** (padrão: `local`). Usar `production` em produção para desabilitar logs verbosos de SQL e documentação Swagger pública se desejado.
- `BACKEND_CORS_ORIGINS`: **Obrigatória para integração** (padrão: `["http://localhost:5173"]`). Deve conter a lista JSON com as URLs dos clientes web/mobile autorizados.
- `LOG_LEVEL`: **Opcional** (padrão: `INFO`). Níveis aceitos: `DEBUG`, `INFO`, `WARNING`, `ERROR`.

### 4. Inicialização do Banco de Dados e Carga de Dados (Seed)
```bash
# 1. Criar as tabelas no banco de dados via Alembic
alembic upgrade head

# 2. Popular o catálogo cinematográfico com os dados do Star Schema (obrigatório se o banco estiver vazio)
python -m scripts.seed1
python -m scripts.seed2
```

### 5. Execução do Servidor de Desenvolvimento
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- A API estará disponível em: `http://127.0.0.1:8000`
- Documentação interativa Swagger: `http://127.0.0.1:8000/docs`
- Documentação Redoc: `http://127.0.0.1:8000/redoc`
- Verificação de saúde: `http://127.0.0.1:8000/health`

### 6. Execução da Suíte de Testes
```bash
# Rodar todos os testes automatizados
pytest

# Rodar com detalhes de execução
pytest -v
```

### 7. Notas e Avisos Importantes
- **Corte de Senha (bcrypt)**: Senhas com mais de 72 bytes sofrem truncamento estrito nativo por restrição do algoritmo.
- **Banco de Dados Local**: O arquivo `.db` é ignorado pelo Git e não acompanha o clone inicial; é necessário executar as migrations e scripts de seed.
- **Execução com PostgreSQL**: Requer ajuste em `app/db/session.py` para ignorar o comando `PRAGMA foreign_keys` caso o dialeto não seja SQLite.

---

## 10. Itens Não Verificáveis

1. **Auditoria Automatizada de Vulnerabilidades em Dependências de Terceiros (CVEs)**:
   - *Motivo*: Ausência de ferramentas como `pip-audit` ou `safety` instaladas no ambiente virtual local. Como as regras de engajamento impedem a instalação de novos utilitários nesta fase, as versões das dependências foram inspecionadas manualmente, sem scanning automatizado de vulnerabilidades de terceiros.
2. **Comportamento em Banco de Dados PostgreSQL Real em Produção**:
   - *Motivo*: O ambiente local de desenvolvimento e testes está configurado e conteinerizado estritamente em SQLite (`aiosqlite` e SQLite em memória). A incompatibilidade identificada na cláusula `PRAGMA` foi deduzida por análise estática de código e compatibilidade de dialetos SQL.
