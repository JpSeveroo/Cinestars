# RocketLab 2026.2 — repositório base

Base inicial para evoluir a atividade do RocketLab 2026.2. Ela preserva a organização do backend,
o modelo relacional do catálogo de filmes em SQLAlchemy 2.0 e o histórico de
migrações com Alembic, sem incluir interface, dados CSV, endpoints de negócio
ou rotinas de carga.

> **Nota:** `RocketLab` é apenas o nome de referência desta base. O diretório,
> nome do pacote, título da API e arquivo do banco podem ser renomeados para o
> que preferirem; eles não representam uma exigência da
> estrutura-base.

## Estrutura

```text
.
├── backend/
│   ├── app/
│   │   ├── api/v1/        # ponto de composição dos futuros routers
│   │   ├── core/          # configurações e logging
│   │   ├── db/            # Base ORM, engine e sessões
│   │   └── movies/        # modelos SQLAlchemy do domínio de filmes
│   ├── migrations/        # ambiente e revisões Alembic
│   └── tests/
└── README.md
```

## Execução

Requer Python 3.11 ou superior.

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -e ".[dev]"
cp .env.example .env
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --reload
```

A API mínima ficará disponível em `http://localhost:8000`; use
`http://localhost:8000/docs` para a documentação automática. O endpoint
`GET /health` permite conferir se a aplicação iniciou corretamente.

## Banco de dados e migrações

O modelo usa um esquema estrela para o catálogo de filmes:

- dimensões de filmes, gêneros, pessoas, produtoras e resumo de avaliações;
- fato de desempenho financeiro e de engajamento;
- tabelas de associação N:N entre filmes, gêneros, produtoras e pessoas;

O schema corresponde aos nove arquivos CSV atuais da camada Diamond, com a
adição de `movie_reviews`: uma avaliação individual por linha, na escala 0–10.
A tabela aceita diretamente as colunas `sk_movie_review_id`, `sk_movie_id`,
`nome`, `nota` e `comentario` do CSV enviado separadamente. `created_at` é
gerado pelo banco. O contexto generativo não faz parte desta base.

O repositório não inclui CSVs nem rotinas de carga. Para usar avaliações,
importe primeiro os filmes em `dim_movies` e depois o CSV de `movie_reviews`.

As tabelas são criadas exclusivamente pelo Alembic. Para evoluir os modelos,
crie uma revisão e aplique-a:

```bash
cd backend
.venv/bin/alembic revision --autogenerate -m "descreva a alteração"
.venv/bin/alembic upgrade head
```

O banco padrão é SQLite local em `backend/cinestars.db`. Ajuste
`DATABASE_URL` no arquivo `.env` para usar outro banco compatível.

### Setup Operacional do Banco de Dados

Caso a base de dados esteja limpa ou recém-criada, execute os comandos obrigatórios de migração e povoamento inicial (seeds) a partir do diretório `backend`:

```bash
alembic upgrade head
python -m scripts.seed1
python -m scripts.seed2
```

## Segurança e Trade-offs do MVP

Para ciência dos avaliadores e auditores técnicos, a aplicação adota as seguintes decisões arquiteturais e mitigações:

### Trade-offs / Riscos Aceitos no MVP

- **Rate Limiting**: Não acoplado ao código da aplicação em desenvolvimento local para evitar contenção em testes assíncronos; recomendado delegar para camadas de borda/reverse proxy (Nginx/Cloudflare) em ambiente produtivo.
- **Revogação de Sessão**: Tokens JWT adotam modelo puramente stateless com ciclo de vida finito pré-determinado.

### Cabeçalhos de Segurança e Restrição de CORS

- **CORS Restrito**: Métodos (`GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`) e cabeçalhos (`Authorization`, `Content-Type`) explicitamente limitados na configuração do `CORSMiddleware`.
- **Headers HTTP OWASP**: Injeção automática dos cabeçalhos defensivos `X-Content-Type-Options: nosniff` e `X-Frame-Options: DENY` via middleware nativo em todas as respostas HTTP.

