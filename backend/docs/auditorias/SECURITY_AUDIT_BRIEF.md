# Brief de Auditoria de Segurança e Prontidão Operacional — Backend CineStars

> Fonte de verdade para o agente (Antigravity) executar a **segunda rodada** de auditoria
> do backend CineStars. A primeira rodada (arquitetura) já foi concluída — ver
> `docs/auditorias/arquitetura/`. Esta rodada cobre o que ficou explicitamente fora de
> escopo antes: **segurança**, e adiciona uma segunda frente: **prontidão operacional**
> (o backend está pronto para alguém clonar o repo, seguir um README e rodar tudo sem
> fricção?).

---

## 1. Papel do Agente

Você atua como **auditor read-only**, igual na rodada anterior. Mapeia, compara e reporta
— não corrige nada. O único artefato produzido é o relatório em Markdown (Seção 7).

Se encontrar um segredo real exposto (chave, senha, token) durante a auditoria, **não o
reproduza no relatório**. Cite o arquivo e a linha, descreva o tipo de segredo genericamente
("chave JWT hardcoded", "credencial de banco em texto plano") e sinalize como 🔴 Crítico —
nunca copie o valor literal para o markdown.

---

## 2. Escopo

### Frente A — Segurança

**Autenticação e gestão de sessão (JWT)**
- Algoritmo de assinatura: confirmar que é `HS256` conforme especificado e que não há
  aceitação de `alg=none` ou de algoritmos alternativos não intencionais.
- Tamanho e origem da chave simétrica: é lida de variável de ambiente ou está hardcoded em
  algum arquivo versionado? Existe fallback inseguro no código caso a env var não esteja
  definida (ex: `os.getenv("SECRET_KEY", "chave-fraca-default")`)?
- Expiração de token: existe `exp` no payload? O valor de expiração é razoável (não
  indefinido, não excessivamente longo)?
- Validação de expiração e assinatura é feita em **toda** rota protegida, sem exceção —
  procure por rotas que declaram dependência de autenticação mas não validam o token
  corretamente, ou que fazem parsing manual do JWT sem usar a lib de validação.
- Existe blacklist/revogação de token, ou uma vez emitido o token é válido até expirar
  mesmo após troca de senha? (Reporte como achado informativo, não necessariamente crítico
  — é uma decisão de design, mas precisa estar documentada.)

**Hashing e credenciais**
- Confirmar que bcrypt é usado corretamente (custo/rounds configurado explicitamente ou
  no padrão da lib, não reduzido para acelerar testes em produção).
- Nenhuma senha, hash, token ou segredo aparece em log, em mensagem de erro retornada ao
  cliente, ou em qualquer resposta de API.
- Comparação de senha usa função de tempo constante (delegada ao bcrypt, não comparação
  manual de string).

**Autorização e controle de acesso (IDOR)**
Este é o ponto mais importante desta frente — teste especificamente:
- Um usuário autenticado consegue, manipulando o ID no payload ou na URL, alterar o status
  de tracking, a review, ou o favorito de **outro** usuário? (`PUT /movies/{id}/status`,
  `POST /movies/{id}/reviews`, `DELETE /movies/{id}/reviews` devem sempre operar sobre o
  usuário do token, nunca sobre um `user_id` vindo do corpo da requisição, se existir tal
  campo.)
- `GET /movies/{id}/reviews/me` e `GET /movies/{id}/my-status` realmente escopam pelo
  usuário do token, ou existe algum caminho de vazamento de dado de outro usuário?
- `GET /users/{nickname}` (perfil público): confirmar que o payload de resposta **não**
  inclui `email` ou qualquer outro dado que a especificação não define como público — a
  especificação em `CineStars_Backend_Requisitos.md` diz explicitamente o que deve
  aparecer no perfil público; qualquer campo além disso é vazamento de dado.

**Validação de entrada e injeção**
- Buscar por qualquer query SQL crua (raw SQL, `text()`, f-string interpolando valor de
  usuário direto em SQL) fora do que já foi corrigido na rodada anterior (escape do
  `search`). Confirmar que **todo** acesso a banco passa pelo ORM parametrizado.
- Validação de tamanho/tipo em todos os campos de entrada (não só os que têm regex
  documentado, como `nickname`) — campos de texto livre (`bio`, `review_text`) têm algum
  limite de tamanho no schema, ou um payload de texto absurdamente grande derruba o
  serviço?
- Upload ou referência de `avatar_url`/`url_poster`: são apenas strings armazenadas, ou o
  backend faz algum fetch/processamento dessas URLs? Se fizer fetch, isso é superfície de
  SSRF e precisa ser reportado.

**Configuração de rede e exposição**
- CORS: qual a configuração atual (`allow_origins`)? Está `*` (qualquer origem) em conjunto
  com `allow_credentials=True`? Essa combinação é um problema real, não teórico.
- Rate limiting / proteção contra força bruta em `POST /auth/login` e `POST /auth/register`
  — existe algum mecanismo, mesmo que básico? Ausência total é achado relevante.
- Headers de segurança HTTP (`X-Content-Type-Options`, etc.) — apenas constate presença ou
  ausência, sem aprofundar em configuração de servidor/proxy que foge do escopo do backend
  em si.

**Segredos no repositório**
- `.env` está no `.gitignore`? Rodar `git log --all --full-history -- .env` (ou
  equivalente) para confirmar se o arquivo `.env` real (não o `.example`) já foi commitado
  em algum momento do histórico, mesmo que hoje esteja ignorado — se sim, o segredo
  daquele commit deve ser considerado comprometido e é achado 🔴 Crítico.
- `.env.example` contém apenas placeholders, nunca um valor real reaproveitado de produção.
- `alembic.ini` e `migrations/env.py`: confirmar que não têm credencial de banco hardcoded.

**Dependências**
- Rodar auditoria de dependências vulneráveis se houver ferramenta disponível no ambiente
  (ex: `pip-audit`). Se não houver ferramenta instalada, **não instale nada novo** — apenas
  reporte como "não verificável, ferramenta de auditoria de dependências ausente" e liste
  as dependências de runtime para revisão manual posterior.

### Frente B — Prontidão Operacional ("casa pronta")

O objetivo aqui é responder: **se alguém clonar este repositório do zero hoje, sem contexto
nenhum, consegue rodar o backend só seguindo instruções escritas?** Isso vai alimentar o
README que ainda será escrito.

**Auditoria de variáveis de ambiente**
Produzir uma tabela completa (vai para o relatório, Seção 7) com **todas** as variáveis de
ambiente realmente lidas pelo código (`os.getenv`, `Settings`/Pydantic Settings, etc.),
contendo: nome da variável, onde é usada (arquivo:linha), se está documentada em
`.env.example`, se tem valor default no código (e se esse default é seguro para produção
ou só serve para dev local), e se é obrigatória para a aplicação subir.

**Reprodutibilidade do setup**
- As dependências declaradas (`pyproject.toml` ou `requirements.txt`) são suficientes para
  rodar o projeto do zero, incluindo as que foram adicionadas na rodada anterior (`bcrypt`,
  `pyjwt`, `email-validator`)? Tente identificar (por leitura, sem instalar nada fora do
  ambiente já existente) se falta alguma dependência de runtime não declarada.
- Existe lockfile (`poetry.lock`, `uv.lock`, `requirements.txt` pinado)? Versões estão
  fixadas ou soltas (`>=` sem teto)?
- O comando de setup de banco é claro e funciona sozinho? (`alembic upgrade head` a partir
  de um banco vazio, sem passos manuais extras não documentados em lugar nenhum.)
- A pasta `data/` — qual sua função real? Contém dados de seed necessários pro projeto
  funcionar, ou é apenas artefato de desenvolvimento? Isso precisa ficar claro para quem
  for escrever o README.
- A pasta `scripts/` — cada script tem propósito claro? Algum deles é um passo obrigatório
  do setup que não está documentado em lugar nenhum ainda?

**Consistência de ambiente**
- Existe diferença de comportamento entre rodar com SQLite (dev/teste) e o banco real de
  produção (se for outro), que precise ser documentada como aviso?
- Versão mínima de Python exigida está declarada em algum lugar (`pyproject.toml`,
  `.python-version`)?

**Insumos para o futuro README**
Ao final desta frente, o relatório deve conter uma lista objetiva (Seção 7.4) de **tudo
que um README precisa cobrir** para que a "pessoa execute os devidos passos e funcione
tudo perfeitamente": pré-requisitos, instalação, variáveis de ambiente obrigatórias vs.
opcionais, comando de migration, comando de subir o servidor, comando de rodar os testes.
Não escreva o README em si — apenas a lista de insumos/lacunas que faltam para escrevê-lo
com confiança.

---

## 3. Fora de Escopo

- Não repita achados de arquitetura já cobertos na rodada anterior (`docs/auditorias/
  arquitetura/RELATORIO_AUDITORIA_CINESTARS.md`) — a menos que o achado tenha uma dimensão
  de segurança nova que não foi capturada lá.
- Não escreva o README nesta rodada — apenas produza os insumos (Seção 2, Frente B).
- Não instale ferramentas novas no ambiente nem rode scanners externos que exijam acesso
  de rede fora do já disponível.
- Testes de penetração ativos (ex: tentar de fato explorar uma vulnerabilidade contra um
  ambiente rodando) estão fora de escopo — a análise é estática/de leitura de código e,
  quando muito, testes locais isolados (como os de IDOR, que podem ser feitos via cliente
  de teste do próprio framework, sem expor nada externamente).

---

## 4. Insumos que o agente deve ter disponíveis
1. Acesso de leitura ao repositório completo (`backend/`).
2. `docs/requisitos/CineStars_Backend_Requisitos.md`.
3. `docs/auditorias/arquitetura/RELATORIO_AUDITORIA_CINESTARS.md` (para não duplicar
   achados já cobertos).
4. Este brief: `docs/auditorias/seguranca/SECURITY_AUDIT_BRIEF.md`.
5. O relatório final deve ser salvo em
   `docs/auditorias/seguranca/RELATORIO_SEGURANCA_CINESTARS.md`.

---

## 5. Regras de Engajamento
- Somente leitura. Nenhuma edição de código, nenhum comando que altere estado (sem
  `alembic upgrade`, sem instalar pacotes, sem editar `.env`).
- Testes que envolvam simular um IDOR (ex: criar dois usuários de teste e checar se um
  acessa dado do outro) podem ser escritos e rodados como **testes temporários** contra o
  ambiente de teste já existente (o mesmo usado pelo `pytest`), nunca contra dado real.
  Se escrever um teste assim, ele deve ser removido ao final ou claramente marcado como
  "teste de auditoria, não faz parte da suíte permanente" — não deixe teste órfão na
  suíte principal sem avisar no relatório.
- Nunca reproduza valor literal de segredo encontrado no código ou no `.env` — ver Seção 1.
- Todo achado cita arquivo e linha. Achados sobre ausência de algo (ex: "sem rate
  limiting") citam onde a ausência foi verificada (ex: arquivo de rotas de auth).
- Itens não verificáveis (ex: falta de ferramenta de auditoria de dependências) são
  marcados como tal, nunca assumidos como "ok".

---

## 6. Taxonomia de Severidade (Frente A)
- 🔴 **Crítico**: segredo exposto, IDOR real confirmado, autenticação contornável.
- 🟠 **Alto**: configuração insegura com exploração plausível (CORS aberto + credentials,
  ausência total de rate limiting em login).
- 🟡 **Médio**: boa prática ausente sem exploração óbvia imediata (headers de segurança,
  hashing sem parâmetros explícitos).
- ⚪ **Baixo/Informativo**: decisão de design que vale documentar mas não é vulnerabilidade.

Para a Frente B (prontidão operacional), use apenas: 🔴 **Bloqueia o setup** / 🟡 **Setup
funciona mas com fricção/ambiguidade** / ⚪ **Nice-to-have para o README**.

---

## 7. Formato do Relatório de Saída

Produza `docs/auditorias/seguranca/RELATORIO_SEGURANCA_CINESTARS.md` com esta estrutura:

```markdown
# Relatório de Auditoria — Segurança e Prontidão Operacional (Backend CineStars)
Data: <data>

## 1. Resumo Executivo
(Estado geral de segurança, nº de achados por severidade, os 3 riscos mais urgentes)

## 2. Autenticação e Gestão de Sessão (JWT)
Achados no formato: descrição | arquivo:linha | severidade | recomendação

## 3. Autorização e Controle de Acesso (IDOR)
Mesmo formato. Inclua explicitamente o resultado de cada teste de IDOR realizado, mesmo
os que passaram (ex: "Testado: usuário A não consegue editar review de B — OK").

## 4. Validação de Entrada e Injeção
Mesmo formato.

## 5. Configuração de Rede (CORS, Rate Limiting, Headers)
Mesmo formato.

## 6. Segredos no Repositório
Mesmo formato — sem reproduzir valores reais de segredo.

## 7. Dependências
Achados ou nota de "não verificável" conforme Seção 2/Frente A do brief.

## 8. Prontidão Operacional
### 8.1. Tabela de Variáveis de Ambiente
Tabela: Variável | Usada em (arquivo:linha) | Documentada em .env.example? | Default
seguro? | Obrigatória?

### 8.2. Reprodutibilidade do Setup
Achados sobre dependências, lockfile, comandos de migration, pasta `data/`, pasta
`scripts/`.

### 8.3. Lacunas para o Setup Funcionar do Zero
Lista objetiva do que quebraria ou geraria dúvida em alguém seguindo o repo pela primeira
vez.

## 9. Insumos para o README
Lista estruturada e pronta para virar seções do README: Pré-requisitos | Instalação |
Variáveis de Ambiente (obrigatórias/opcionais) | Migrations | Rodando o servidor |
Rodando os testes | Notas/Avisos.

## 10. Itens Não Verificáveis
Lista do que não pôde ser confirmado e por quê.
```

---

## 8. Prompt de Kickoff (cole isto no Antigravity para iniciar)

> Leia integralmente `docs/auditorias/seguranca/SECURITY_AUDIT_BRIEF.md`,
> `docs/requisitos/CineStars_Backend_Requisitos.md` e
> `docs/auditorias/arquitetura/RELATORIO_AUDITORIA_CINESTARS.md` neste repositório antes de
> qualquer ação. Execute a auditoria de segurança e prontidão operacional conforme definido
> no brief, cobrindo as duas frentes obrigatórias (Seção 2: Segurança e Prontidão
> Operacional) — não pule a Frente B mesmo que a Frente A traga muitos achados. Preste
> atenção especial aos testes de IDOR descritos na Seção 2 (Autorização) e à tabela
> completa de variáveis de ambiente da Seção 2 (Frente B). Você pode escrever e rodar
> testes temporários contra o ambiente de teste já existente para validar hipóteses de
> IDOR, mas não altere nenhum código de produção, não rode migrations, não instale
> dependências novas e nunca reproduza valor literal de segredo encontrado — apenas cite
> onde ele está. Produza o relatório em
> `docs/auditorias/seguranca/RELATORIO_SEGURANCA_CINESTARS.md`, seguindo exatamente a
> estrutura da Seção 7 do brief. Ao final, não faça mais nada além de entregar o relatório
> — nenhuma correção de código nesta etapa.
