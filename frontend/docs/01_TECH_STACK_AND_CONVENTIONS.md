# 01 - Stack Tecnológica e Convenções de Engenharia (Frontend CineStars)
**Versão:** 1.0.0  
**Ambiente Alvo:** Web SPA (Single Page Application)  
**Backend de Integração:** FastAPI Assíncrono (`http://127.0.0.1:8000/api/v1`)

---

## 1. Visão Geral e Princípios de Engenharia

O frontend do **CineStars** é concebido como uma Single Page Application (SPA) moderna, ultraveloz, responsiva e estritamente tipada de ponta a ponta. Seu propósito é oferecer a experiência cinematográfica e imersiva inspirada no Letterboxd, baseando-se em três pilares fundamentais:

1. **Separação Rígida de Estados (Server State vs. Client State):** Dados de catálogo, avaliações, perfis e estante pertencem ao servidor e são gerenciados/cacheados exclusivamente via **TanStack Query**. O estado local do cliente é restrito à sessão do usuário autenticado e controles efêmeros de interface (modais, menus).
2. **Zero Invenção de Contratos:** Todas as tipagens TypeScript de entrada e saída devem espelhar fielmente os esquemas Pydantic já homologados no backend. Nenhuma propriedade pode ser inventada ou renomeada no client-side.
3. **Anti-Overengineering:** Rejeição explícita a soluções complexas de estado global (Redux, MobX), micro-frontends ou bibliotecas pesadas de CSS-in-JS. O foco é produtividade, desempenho de renderização e manutenibilidade por meio de Tailwind CSS utilitário.

---

## 2. Stack Tecnológica Primária

| Camada / Função | Tecnologia | Versão Mínima | Justificativa Técnica |
| :--- | :--- | :---: | :--- |
| **Runtime & Bundler** | Node.js + Vite | Node 20+ / Vite 6+ | HMR (Hot Module Replacement) instantâneo, build veloz via esbuild e suporte nativo a ESM. |
| **Framework Base** | React | 19.x (ou 18.3+) | Ecossistema maduro, suporte a concorrência e integração nativa com TypeScript. |
| **Linguagem** | TypeScript | 5.5+ | Modo estrito (`strict: true`), garantindo segurança estática e eliminando erros de runtime no consumo de APIs. |
| **Roteamento** | React Router DOM | 6.26+ | Suporte a rotas aninhadas (nested layouts), rotas protegidas por autenticação e controle de histórico do navegador. |
| **Estilização** | Tailwind CSS | 3.4+ | Framework utilitário de estilização atômica, essencial para o tema escuro cinematográfico sem overhead de CSS em tempo de execução. |
| **Utilitários de CSS** | `clsx` + `tailwind-merge` | Últimas | Composição condicional de classes utilitárias evitando conflitos de especificidade via função auxiliar `cn()`. |
| **Ícones** | Lucide React | Última | Conjunto leve e consistente de ícones vetoriais modernos (estrelas, badges, listas, usuário, busca). |
| **Cliente HTTP** | Axios | 1.7+ | Suporte maduro a instâncias isoladas, transformadores de dados e interceptors de requisição (Bearer token) e resposta (logout em 401). |
| **Server State & Cache** | TanStack Query (React Query) | 5.50+ | Invalidação declarativa de cache, sincronização em background, controle de loading/error e mutações otimistas. |
| **Client State (Sessão)** | Zustand | 4.5+ | Gerenciamento de estado global minimalista, sem boilerplate e com persistência automática no `localStorage` via middleware. |
| **Formulários & Validação** | React Hook Form + Zod | RHF 7.50+ / Zod 3.23+ | Validação de schemas declarativa no cliente, espelhando os limites e tipos validados pelo Pydantic no backend. |
| **Notificações / Feedback** | Sonner | Última | Sistema de toasts limpo, não intrusivo e customizável para feedback de ações (ex: "Filme marcado como assistido"). |

---

## 3. Estrutura de Diretórios Padronizada

```text
frontend/
├── public/                     # Favicons, assets estáticos e logos
├── src/
│   ├── assets/                 # Imagens locais, ilustrações e fallbacks (ex: poster-placeholder.png)
│   ├── components/
│   │   ├── layout/             # Shell visual da aplicação
│   │   │   ├── Navbar.tsx      # Barra de navegação com busca e avatar
│   │   │   ├── Footer.tsx      # Rodapé padronizado
│   │   │   └── Layout.tsx      # Container com Navbar + Outlet + Footer
│   │   ├── shared/             # Componentes de negócio reutilizáveis
│   │   │   ├── MovieCard.tsx   # Card de filme (pôster 2:3, hover e tags)
│   │   │   ├── StarRating.tsx  # Controle/Visualizador de meias estrelas (0.5 a 5.0)
│   │   │   ├── TrackingActions.tsx # Botões de status: Assistido, Quero Assistir, Favorito
│   │   │   └── ReviewModal.tsx # Modal para escrita/edição de resenha
│   │   └── ui/                 # Primitivas de interface desacopladas
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       ├── Badge.tsx
│   │       └── Skeleton.tsx    # Placeholders de carregamento
│   ├── hooks/                  # Hooks customizados reutilizáveis (useDebounce, etc.)
│   ├── lib/                    # Instâncias de infraestrutura e utilitários
│   │   ├── api.ts              # Instância do Axios com interceptors configurados
│   │   └── utils.ts            # Função cn() e formatadores auxiliares
│   ├── pages/                  # Telas da aplicação (roteadas)
│   │   ├── HomePage.tsx        # Feed global e destaques
│   │   ├── CatalogPage.tsx     # Exploração de catálogo com busca e paginação
│   │   ├── MovieDetailPage.tsx # Ficha técnica do filme, média e reviews
│   │   ├── LibraryPage.tsx     # Estante pessoal com abas de status
│   │   ├── ProfilePage.tsx     # Perfil público (/users/:nickname)
│   │   ├── LoginPage.tsx       # Autenticação híbrida
│   │   └── RegisterPage.tsx    # Cadastro de cinéfilo
│   ├── routes/                 # Definição e proteção de rotas
│   │   ├── AppRoutes.tsx       # Mapeamento do React Router
│   │   └── ProtectedRoute.tsx  # Guard que redireciona usuários anônimos
│   ├── store/                  # Stores locais do Zustand
│   │   └── authStore.ts        # Gerenciamento de token JWT, usuário ativo e logout
│   ├── types/                  # Tipagens TypeScript (Espelho dos Schemas Pydantic)
│   │   ├── auth.ts
│   │   ├── movie.ts
│   │   ├── tracking.ts
│   │   └── review.ts
│   ├── App.tsx                 # Providers (QueryClientProvider, Toaster, Router)
│   ├── index.css               # Diretivas do Tailwind e tokens globais
│   └── main.tsx                # Ponto de entrada do React
├── .env.example                # Variáveis de ambiente requeridas
├── index.html
├── package.json
├── tsconfig.json               # Configurações estritas do TypeScript
└── vite.config.ts              # Configuração do Vite com aliases (@/)
```

---

## 4. Convenções de Código e Padrões de Projeto

### 4.1. Importações e Path Aliases
O projeto adota obrigatoriamente o alias `@/` apontando diretamente para a pasta `src/`:

```typescript
// ✅ Recomendado:
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import type { MovieDetail } from "@/types/movie";

// ❌ Proibido (navegação relativa profunda):
import { Button } from "../../../components/ui/Button";
```

### 4.2. Tratamento Estrito de Tipos
- Proibido o uso de `any`. Caso um tipo seja temporariamente desconhecido, utilize `unknown` associado a Type Guards ou validação com Zod.
- Tipos de dados opcionais vindos da API devem refletir a nulidade exata do banco de dados (`string | null`, não apenas `string | undefined`).
- Enums e status do backend (como `MovieWatchStatus`) devem ser espelhados como união literal de strings com const assertion:

```typescript
export const WatchStatus = {
  QUERO_ASSISTIR: "QUERO_ASSISTIR",
  ASSISTINDO: "ASSISTINDO",
  ASSISTIDO: "ASSISTIDO",
  ABANDONEI: "ABANDONEI",
} as const;

export type WatchStatusType = typeof WatchStatus[keyof typeof WatchStatus];
```

### 4.3. Tratamento Centralizado de Erros da API
O backend do CineStars devolve erros no formato padronizado `{"detail": "Mensagem descritiva"}`:
- Falhas de autenticação (`401`) em rotas privadas devem limpar o token local e redirecionar o usuário para `/login`.
- Erros de validação (`422`) ou conflitos de unicidade (`409`) devem ser capturados pelo Axios e exibidos via toast ou mensagem em linha no formulário:

```typescript
try {
  await api.post("/auth/register", data);
} catch (error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.detail || "Erro inesperado ao cadastrar.";
    toast.error(message);
  }
}
```

### 4.4. Formulários e Validação
- Formulários mutáveis (Login, Cadastro, Publicação de Review) devem ser implementados com `react-hook-form` integrado ao `@hookform/resolvers/zod`.
- O cliente deve espelhar as mesmas travas de validação do backend (ex: corte de senha em 72 bytes, nota restrita entre 0.5 e 5.0, validação de formato de nickname).

---

## 5. Variáveis de Ambiente no Frontend

O frontend comunica-se exclusivamente com a API através de variáveis prefixadas por `VITE_`:

### Arquivo `.env.example`
```env
# URL base da API FastAPI com o prefixo da versão
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

O cliente HTTP deve inicializar a conexão a partir dessa variável:

```typescript
// src/lib/api.ts
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "[http://127.0.0.1:8000/api/v1](http://127.0.0.1:8000/api/v1)",
  headers: {
    "Content-Type": "application/json",
  },
});
```

---

## 6. Anti-Padrões Proibidos

1. **Manipulação direta de DOM:** Proibido uso de `document.getElementById` ou seletores manuais; todo estado visual é derivado declarativamente via React.
2. **Armazenamento de dados da API no Zustand:** Apenas token JWT, dados do usuário ativo e estados locais efêmeros de UI devem residir no Zustand. Listas de filmes, reviews e buscas pertencem exclusivamente ao cache do TanStack Query.
3. **Chamadas diretas de `fetch()` em componentes:** Toda requisição deve obrigatoriamente passar pela instância configurada `api` (`src/lib/api.ts`) envelopada por um hook do TanStack Query (`useQuery` ou `useMutation`).
4. **Instalação de bibliotecas redundantes:** É estritamente vetada a instalação de outras bibliotecas de estado (Redux, Recoil), componentes genéricos pré-montados pesados (Material UI, Ant Design) ou clientes HTTP alternativos.