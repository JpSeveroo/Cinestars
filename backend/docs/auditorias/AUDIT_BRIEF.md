# Brief de Auditoria Técnica — Backend CineStars

> Este documento é a fonte de verdade para o agente (Antigravity) executar uma varredura
> arquitetural e de código no backend do CineStars. Leia por completo antes de iniciar.
> Em caso de conflito entre este brief e qualquer instrução verbal recebida depois, este
> documento prevalece, salvo confirmação explícita do responsável humano.

---

## 1. Papel do Agente

Você atua como **auditor técnico read-only**. Seu trabalho é **mapear, comparar e reportar**,
não corrigir. Você não deve editar, refatorar, formatar ou "consertar" nenhum arquivo do
projeto durante esta tarefa. O único artefato que você produz é um relatório em Markdown
(formato definido na Seção 6).

Se em algum momento você identificar um problema tão crítico que pareça exigir correção
imediata (ex: dado sendo corrompido silenciosamente), **não corrija** — registre como
achado de severidade máxima e explique o risco.

---

## 2. Escopo (o que DEVE ser avaliado)

A auditoria tem **duas frentes independentes**, ambas obrigatórias:

- **Frente A — Conformidade com a especificação**: use o arquivo
  `CineStars_Backend_Requisitos.md` (anexo) como especificação-fonte e confronte o código
  real com o que está documentado (Seções 2.1 a 2.4 abaixo).
- **Frente B — Saúde arquitetural geral**: avalie a qualidade do código e da arquitetura
  **por si só**, com base em boas práticas de engenharia, independentemente do que o
  documento de requisitos diz (Seção 2.6 abaixo). Um código pode estar 100% conforme à
  especificação e, ainda assim, ter problemas arquiteturais sérios — é essa frente que
  captura isso.

### 2.1. Conformidade com o contrato da API
Para cada linha da Matriz de Contratos (Seção 3 do documento de requisitos) e cada subseção
funcional (2.1 a 2.7), verifique:
- O endpoint existe, com método HTTP, rota e autenticação exatamente como especificado.
- O payload de entrada (schema/DTO) bate com o contrato documentado (campos obrigatórios,
  opcionais, tipos).
- Os códigos de status HTTP retornados (`200`, `204`, `400`, `401`, `404`, `409`, `422`)
  correspondem às regras descritas — não apenas ao "caminho feliz".
- O payload de saída não vaza dados que a especificação diz que nunca devem ser expostos
  (ex: senha/hash em `UserResponse`).

### 2.2. Regras de negócio específicas (checklist obrigatório)
Verifique implementação real de cada uma destas regras, citando arquivo e linha:
- [ ] Resolução transparente de ID (`id_filme` natural OU `sk_movie_id` SHA-256) em **todos**
      os endpoints que recebem identificador de filme.
- [ ] Login híbrido: campo `login` aceita email OU nickname via `or_()` (ou equivalente).
- [ ] Hash de senha via bcrypt com corte de 72 bytes — confirme que a senha é truncada/
      tratada antes do hashing, e não apenas documentada como tal.
- [ ] Unicidade de `email` e `nickname` retornando `409 Conflict` (não `500` ou `400`).
- [ ] Busca de filmes com escape de caracteres curinga `_` e `%` no `search` (proteção
      contra LIKE injection funcional, não apenas de segurança — foco aqui é correção).
- [ ] Paginação: `page`, `page_size`/`per_page` com defaults e máximos corretos (max 100
      em `/movies`, max 50 em `/feed`), e `total_pages` computado corretamente (incluindo
      arredondamento para cima).
- [ ] Eager loading real (não N+1) nos endpoints de listagem (`/movies`, `/feed`,
      `/users/{nickname}`) — inspecione as queries geradas, não apenas o uso de
      `selectin`/`joinedload` no código.
- [ ] **Regra "Letterboxd" (auto-watched):** `POST /movies/{id}/reviews` deve marcar
      automaticamente `status = ASSISTIDO` na tabela de tracking. Confirme que isso ocorre
      em todos os caminhos (criação E edição de review), inclusive dentro de transação
      atômica com a criação da review.
- [ ] **Upsert semântico:** `PUT /movies/{id}/status` e `POST /movies/{id}/reviews` nunca
      criam linha duplicada para o mesmo usuário+filme — devem atualizar a existente.
- [ ] **Remoção segura de status:** enviar `"status": null` limpa o status sem apagar
      `is_favorite`.
- [ ] **Validação de nota:** `rating` estritamente entre 0.5 e 5.0, em passos de 0.5
      (`(rating * 2) % 1 == 0`), retornando `422` para valores fora do padrão (ex: `4.3`).
      Teste também limites (`0.4`, `5.1`, `0`, negativo).
- [ ] `DELETE /movies/{id}/reviews`: `204` em sucesso, `404` se review não existir.
- [ ] Agregações condicionais do perfil público (`func.count(case(...))`) calculadas em
      uma única query, não em N queries separadas por status.
- [ ] `LIMIT 4` (favoritos) e `LIMIT 5` (últimas resenhas) no perfil público, com ordenação
      correta (mais recentes primeiro).
- [ ] `GET /users/{nickname}` retorna `404` centralizado quando nickname não existe, e não
      requer autenticação.

### 2.3. Código morto e resíduos de desenvolvimento
- Endpoints, schemas, modelos ou funções que não são mais referenciados por nenhuma rota
  ativa.
- Vestígios dos itens explicitamente **descartados** na Seção 4 do documento de requisitos:
  - Listas personalizadas de usuário (*User Custom Lists*)
  - Filtro por serviço de streaming ("onde assistir")
  - Escala de avaliação 0–10 (deve estar 100% migrada para 0.5–5.0)
  - Login exclusivo por nickname (deve estar 100% migrado para híbrido)
  Se encontrar código, colunas de banco, migrations, schemas ou testes remanescentes
  desses itens descartados, reporte como código morto com referência explícita à decisão
  arquitetural que os tornou obsoletos.
- Imports não utilizados, funções/métodos sem nenhuma chamada, endpoints duplicados ou
  sombreados (rotas conflitantes), feature flags mortas, variáveis de ambiente declaradas
  mas nunca lidas.
- Migrations de banco órfãs (sem modelo correspondente) ou modelos sem migration.

### 2.4. Consistência arquitetural
- Aderência real à arquitetura de "vertical slices por feature" (`users`, `movies`,
  `tracking`, `reviews`) — identifique acoplamento cruzado indevido entre slices,
  lógica de negócio vazando para camadas de rota/schema, ou duplicação de lógica que
  deveria estar centralizada.
- Consistência de padrão de erro: todos os erros seguem o formato
  `{"detail": "mensagem descritiva"}`? Existe algum endpoint que foge desse padrão?
- Consistência de nomenclatura entre camadas (ex: mesmo campo com nomes diferentes em
  schema vs. modelo vs. resposta).

### 2.5. Avaliação Arquitetural Ampla (independente da especificação)

Esta frente ignora o documento de requisitos e avalia o backend como um engenheiro sênior
avaliaria qualquer sistema desconhecido, do zero. Cubra pelo menos:

**Camadas e separação de responsabilidades**
- Existe separação clara entre camada de rota (controller/handler), lógica de negócio
  (service) e acesso a dados (repository/ORM)? Ou a lógica de negócio vaza para dentro dos
  handlers de rota, ou queries SQL cruas aparecem espalhadas fora da camada de dados?
- Schemas/DTOs (Pydantic ou equivalente) estão desacoplados dos modelos de banco, ou o
  modelo de banco é serializado diretamente como resposta de API?

**Acoplamento e coesão entre módulos**
- Grau de acoplamento entre os slices (`users`, `movies`, `tracking`, `reviews`): um slice
  importa detalhes internos de outro em vez de depender de uma interface/contrato claro?
- Existem "god modules" (arquivos/classes que concentram responsabilidades demais)?
- Dependências circulares entre módulos.

**Design de banco de dados**
- Normalização adequada vs. redundância de dados não justificada.
- Chaves estrangeiras e constraints de integridade realmente aplicadas no schema (não só
  validadas na aplicação).
- Índices presentes nas colunas usadas em filtros/ordenações frequentes (ex: `created_at`
  do feed, `nickname`, `email`, FK de tracking/review) — ausência de índice onde a
  especificação menciona ordenação/filtro é achado válido aqui.
- Uso de migrations: histórico consistente, sem migrations conflitantes ou "gambiarra"
  (ex: alteração direta de schema fora do fluxo de migration).
- Nomenclatura consistente entre tabelas/colunas (ex: prefixos `Dim`/`Fact` mencionados no
  requisito são aplicados de forma consistente em todo o schema?).

**Tratamento de erros e observabilidade**
- Existe uma estratégia central de tratamento de exceções (exception handler global) ou
  cada rota trata erro à sua maneira?
- Logging estruturado existe? Em que nível (request, erro, negócio)? Ausência total de
  logging é um achado relevante aqui.
- Uso de exceções genéricas (`except Exception`) que escondem a causa raiz.

**Configuração e gestão de dependências**
- Configuração (variáveis de ambiente, settings) centralizada e tipada, ou espalhada em
  `os.getenv()` soltos pelo código?
- Dependências declaradas (requirements/pyproject) vs. realmente usadas — bibliotecas
  importadas no projeto mas nunca chamadas, ou usadas mas não declaradas.
- Versionamento de dependências (pinned vs. solto) e presença de lockfile.

**Convenções de API e consistência de design**
- Convenções REST seguidas de forma consistente (nomes de recursos no plural, verbos HTTP
  usados semanticamente corretos, uso consistente de query params vs. path params).
- Versionamento de API (`/v1`) aplicado de forma consistente em todas as rotas, sem rotas
  "esquecidas" fora do prefixo.
- Consistência de formato de resposta entre endpoints (paginação, nomes de campo, casing).

**Testabilidade e dívida técnica**
- O código é testável (injeção de dependência, sem singletons globais difíceis de mockar,
  sem I/O direto misturado com lógica pura)?
- Estrutura geral de testes: unitários vs. integração, cobertura por camada (não é
  necessário rodar ferramenta de cobertura se não houver uma configurada — avalie
  qualitativamente pelo que existe).
- Padrões de design aplicados de forma correta vs. mal aplicada (ex: uso de
  repository/service pattern pela metade, ORM sendo usado ora como ActiveRecord ora como
  Data Mapper sem critério).
- Extensibilidade: o quão fácil seria adicionar uma nova feature seguindo o padrão atual
  do projeto (avaliação qualitativa, com exemplo concreto se possível).

**Duplicação e complexidade**
- Blocos de lógica repetidos entre arquivos/módulos que deveriam ser extraídos para uma
  função/serviço compartilhado.
- Funções ou métodos excessivamente longos ou com complexidade ciclomática alta (muitos
  `if`/`elif` aninhados, múltiplas responsabilidades numa função só).

### 2.6. Qualidade geral (não-segurança)
- Tratamento de exceções: cenários que podem derrubar a aplicação com erro não tratado
  (500 genérico) em vez de um erro de negócio apropriado.
- Testes automatizados existentes: cobrem as regras da Seção 2.2 acima? Quais regras
  estão sem nenhum teste?
- Duplicação de lógica entre endpoints que deveria ser extraída (ex: lógica de resolução
  de ID repetida em múltiplos handlers).

---

## 3. Fora de Escopo (NÃO avaliar nesta rodada)

- **Segurança** (injection, exposição de segredos, rate limiting, validação de JWT,
  configuração de CORS, headers, etc.) — será revisada separadamente pelo responsável
  humano. Não abra essa frente, mesmo que note algo suspeito; se notar, apenas **anote em
  uma seção separada "Observado, fora de escopo"** com uma linha, sem investigar a fundo.
- Performance/carga (benchmarks, tempo de resposta) além do que já está coberto pela
  checagem de N+1 acima.
- Decisões de produto/UX do frontend — este backend é a fonte de verdade sobre o que o
  frontend consome; não avalie o frontend.
- Infraestrutura, deploy, CI/CD.

---

## 4. Insumos que o agente deve ter disponíveis
1. Acesso de leitura ao repositório completo do backend.
2. O arquivo `CineStars_Backend_Requisitos.md` (documento de especificação anexado).
3. Este brief (`AUDIT_BRIEF.md`).

---

## 5. Regras de Engajamento
- **Somente leitura**: não editar código, não rodar `git commit`, não formatar arquivos.
- Rodar a suíte de testes existente (se houver) é permitido e incentivado, mas apenas
  como fonte de evidência para o relatório — nunca para "consertar" o que falhar.
- Todo achado precisa citar **arquivo e linha (ou intervalo de linhas)**. Achados sem
  referência de código concreta serão descartados na revisão.
- Não especule sobre intenção do desenvolvedor ("provavelmente esqueceram..."); descreva
  apenas o comportamento observado vs. o especificado.
- Se um item do checklist da Seção 2.2 não puder ser verificado com confiança (ex: falta
  de teste, comportamento não determinístico), marque explicitamente como
  **"Não verificável"** e explique por quê, em vez de assumir que está correto.

---

## 6. Formato do Relatório de Saída

Produza um único arquivo `RELATORIO_AUDITORIA_CINESTARS.md` com esta estrutura fixa:

```markdown
# Relatório de Auditoria — Backend CineStars
Data: <data>
Escopo: Arquitetura e código (segurança excluída — ver seção "Observado, fora de escopo")

## 1. Resumo Executivo
(5–10 linhas: estado geral, nº de achados por severidade, principais riscos)

## 2. Conformidade com o Contrato da API
Tabela: Endpoint | Conforme? (Sim/Não/Parcial) | Observação

## 3. Checklist de Regras de Negócio (Seção 2.2 do brief)
Tabela: Regra | Status (OK / Falha / Não verificável) | Arquivo:Linha | Evidência

## 4. Achados — Código Morto
Lista, cada item com: descrição | arquivo:linha | severidade | recomendação

## 5. Avaliação Arquitetural Ampla (Frente B, independente da especificação)
Subseções: Camadas e Responsabilidades | Acoplamento/Coesão | Design de Banco de Dados |
Tratamento de Erros e Observabilidade | Configuração e Dependências | Convenções de API |
Testabilidade e Dívida Técnica | Duplicação e Complexidade.
Cada achado: descrição | arquivo:linha (ou módulo, se for um padrão espalhado) | severidade
| recomendação.

## 6. Achados — Consistência Arquitetural (vs. o descrito na especificação)
Mesmo formato do item 4. (Isto é sobre aderência ao que a spec descreve como arquitetura
de vertical slices — distinto da Seção 5, que avalia a arquitetura por si só.)

## 7. Achados — Qualidade Geral
Mesmo formato do item 4.

## 8. Observado, fora de escopo (segurança)
Lista curta, uma linha por item, sem aprofundamento.

## 9. Itens Não Verificáveis
Lista do que não pôde ser confirmado e por quê.
```

**Taxonomia de severidade** (usar em todos os achados):
- 🔴 **Crítico**: quebra uma regra de negócio central ou corrompe dado.
- 🟠 **Alto**: contrato de API divergente da especificação.
- 🟡 **Médio**: código morto, duplicação, inconsistência de padrão.
- ⚪ **Baixo**: nit de qualidade sem impacto funcional.

---

## 7. Prompt de Kickoff (cole isto no Antigravity para iniciar)

> Leia integralmente `AUDIT_BRIEF.md` e `CineStars_Backend_Requisitos.md` neste repositório
> antes de qualquer ação. Execute a auditoria completa conforme definido no brief — ela tem
> duas frentes obrigatórias e independentes: (A) conformidade do código com o que está
> especificado em `CineStars_Backend_Requisitos.md`, incluindo o checklist da Seção 2.2; e
> (B) avaliação da saúde arquitetural do backend por si só, conforme o checklist da Seção
> 2.5, sem depender do documento de requisitos. Não pule a Frente B só porque o código está
> conforme à especificação — as duas coisas são independentes. Não corrija nada no código —
> apenas leia, execute testes existentes se úteis como evidência, e produza
> `RELATORIO_AUDITORIA_CINESTARS.md` na raiz do projeto, seguindo exatamente a estrutura da
> Seção 6. Segurança está fora de escopo (Seção 3) — apenas anote observações rápidas nessa
> área, sem investigar. Ao final, não faça mais nada além de entregar o relatório.
