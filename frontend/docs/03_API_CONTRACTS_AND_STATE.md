# 03 - Contratos de API, Tipagens e Gerenciamento de Estado
**Versão:** 1.0.0  
**Ambiente Alvo:** Web SPA (Frontend CineStars)  
**Backend:** FastAPI Assíncrono (`http://127.0.0.1:8000/api/v1`)  
**Padrão de Resposta de Erro:** `{"detail": string | Array<{loc: string[], msg: string, type: string}>}`

---

## 1. Visão Geral e Diretrizes para o Agente

Este documento define os **contratos estritos de comunicação**, as **interfaces TypeScript** e as **regras de sincronização de estado** que o agente deve implementar no código do frontend.

### Regras Mandatórias de Implementação:
1. **Nenhuma propriedade pode ser renomeada ou omitida:** As chaves retornadas pelo backend em snake_case ou propriedades específicas (`sk_movie_id`, `id_filme`, `ano_lancamento`, `url_poster`) devem ser mantidas exatamente como definidas.
2. **Separação de Estado:**
   - **Estado do Servidor (Cache & Server State):** TanStack Query (`useQuery`, `useMutation`). Proibido guardar listas de filmes, feeds ou estatísticas no Zustand.
   - **Estado do Cliente (Client State):** Zustand com persistência local exclusivamente para sessão do usuário (`token`, `user`, `isAuthenticated`).
3. **Tratamento de 401:** Se qualquer requisição privada retornar HTTP 401, o token deve ser purgado da store e o usuário deve ser redirecionado para a tela de login.

---

## 2. Cliente HTTP Centralizado (`src/lib/api.ts`)

O agente deve criar a instância do Axios com os interceptors de injeção de token e captura de desautenticação:

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/authStore";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "[http://127.0.0.1:8000/api/v1](http://127.0.0.1:8000/api/v1)",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Interceptor de Requisição: Injeta Bearer token se existir sessão ativa
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Interceptor de Resposta: Trata 401 em rotas protegidas
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    if (error.response?.status === 401) {
      const isAuthRoute =
        error.config?.url?.includes("/auth/login") ||
        error.config?.url?.includes("/auth/register");

      if (!isAuthRoute) {
        useAuthStore.getState().logout();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 3. Tipagens TypeScript Estritas (Espelho dos Schemas Backend)

O agente deve criar os arquivos de tipos dentro de `src/types/` exatamente como descrito abaixo:

### 3.1. Tipos Comuns e Paginação (`src/types/common.ts`)

```typescript
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  detail: string;
}
```

### 3.2. Autenticação e Usuários (`src/types/auth.ts`)

```typescript
export interface User {
  id: number;
  email: string;
  nickname: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface LoginPayload {
  identifier: string; // Aceita nickname ou e-mail (Login Híbrido)
  password: string;
}

export interface RegisterPayload {
  email: string;
  nickname: string;
  password: string;
  avatar_url?: string | null;
  bio?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: "bearer";
  user: User;
}
```

### 3.3. Catálogo de Filmes (`src/types/movie.ts`)

```typescript
export interface MovieCardItem {
  sk_movie_id: number;
  id_filme: string;
  titulo: string;
  ano_lancamento: number | null;
  url_poster: string | null;
  nota_media: number | null;
  total_avaliacoes: number;
}

export interface MovieDetail extends MovieCardItem {
  duracao_minutos: number | null;
  sinopse: string | null;
  generos: string[];
}

export interface MovieFilterParams {
  page?: number;
  page_size?: number;
  search?: string;
  genre?: string;
}
```

### 3.4. Tracking e Biblioteca Pessoal (`src/types/tracking.ts`)

```typescript
export const WatchStatus = {
  QUERO_ASSISTIR: "QUERO_ASSISTIR",
  ASSISTINDO: "ASSISTINDO",
  ASSISTIDO: "ASSISTIDO",
  ABANDONEI: "ABANDONEI",
} as const;

export type WatchStatusType = typeof WatchStatus[keyof typeof WatchStatus];

export interface TrackingMovieCard {
  sk_movie_id: number;
  id_filme: string;
  titulo: string;
  ano_lancamento: number | null;
  url_poster: string | null;
  status: WatchStatusType | null;
  is_favorite: boolean;
  updated_at: string;
}

export interface UpdateTrackingPayload {
  status?: WatchStatusType | null;
  is_favorite?: boolean;
}

export interface TrackingResponse {
  sk_movie_id: number;
  user_id: number;
  status: WatchStatusType | null;
  is_favorite: boolean;
  updated_at: string;
}

export interface LibraryFilterParams {
  status?: WatchStatusType;
  is_favorite?: boolean;
  page?: number;
  page_size?: number;
}
```

### 3.5. Avaliações e Feed Comunitário (`src/types/review.ts`)

```typescript
export interface ReviewAuthor {
  id: number;
  nickname: string;
  avatar_url: string | null;
}

export interface ReviewItem {
  id: number;
  sk_movie_id: number;
  user: ReviewAuthor;
  rating: number; // Restrito a intervalos de 0.5 (0.5 a 5.0)
  review_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedReviewItem extends ReviewItem {
  movie_title: string;
  movie_year: number | null;
  movie_poster_url: string | null;
}

export interface CreateReviewPayload {
  rating: number; // Validação: 0.5 <= rating <= 5.0 e rating % 0.5 === 0
  review_text?: string | null;
}

export interface UpdateReviewPayload {
  rating?: number;
  review_text?: string | null;
}
```

### 3.6. Perfil Social e Agregações (`src/types/profile.ts`)

```typescript
import { MovieCardItem } from "./movie";
import { ReviewItem } from "./review";

export interface UserStats {
  total_watched: number;
  total_reviews: number;
  total_want_to_watch: number;
  total_favorites: number;
}

export interface PublicUserProfile {
  user: {
    id: number;
    nickname: string;
    bio: string | null;
    avatar_url: string | null;
    created_at: string;
  };
  stats: UserStats;
  favorite_movies: MovieCardItem[]; // Top 4 filmes favoritos
  recent_reviews: ReviewItem[];      // Últimas 5 resenhas
}
```

---

## 4. Estado Global de Sessão: Zustand (`src/store/authStore.ts`)

O store de autenticação gerencia exclusivamente o estado de login do usuário logado:

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User } from "@/types/auth";

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  updateUser: (userData: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token: string, user: User) =>
        set({
          token,
          user,
          isAuthenticated: true,
        }),

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),

      logout: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "cinestars-auth-session",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

---

## 5. Factory de Chaves de Cache: TanStack Query (`src/lib/queryKeys.ts`)

Para evitar chaves mágicas espalhadas pelo código, todas as queries e mutações devem consumir esta factory:

```typescript
import { MovieFilterParams } from "@/types/movie";
import { LibraryFilterParams } from "@/types/tracking";

export const queryKeys = {
  movies: {
    all: ["movies"] as const,
    list: (filters: MovieFilterParams) => ["movies", "list", filters] as const,
    detail: (movieId: number) => ["movies", "detail", movieId] as const,
  },
  tracking: {
    all: ["tracking"] as const,
    byMovie: (movieId: number) => ["tracking", "movie", movieId] as const,
    library: (filters: LibraryFilterParams) => ["tracking", "library", filters] as const,
  },
  reviews: {
    all: ["reviews"] as const,
    byMovie: (movieId: number, page: number) => ["reviews", "movie", movieId, page] as const,
    feed: (page: number) => ["reviews", "feed", page] as const,
  },
  users: {
    profile: (nickname: string) => ["users", "profile", nickname] as const,
  },
};
```

---

## 6. Regras Críticas de Invalidação de Cache

O agente deve configurar as seguintes invalidações no `onSuccess` das mutações:

### 6.1. Efeito Colateral: Publicar/Editar Avaliação (`POST /movies/:id/reviews`)
- **Regra do Backend:** Ao criar uma avaliação, o backend marca o filme automaticamente como `ASSISTIDO` na tabela de tracking (*Letterboxd Auto-Watched Rule*).
- **Invalidações Obrigatórias:**
  ```typescript
  queryClient.invalidateQueries({ queryKey: queryKeys.reviews.byMovie(movieId, 1) });
  queryClient.invalidateQueries({ queryKey: queryKeys.tracking.byMovie(movieId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.tracking.library({}) });
  queryClient.invalidateQueries({ queryKey: queryKeys.movies.detail(movieId) }); // Atualiza nota média
  ```

### 6.2. Efeito Colateral: Modificar Tracking (`PUT /movies/:id/tracking`)
- **Invalidações Obrigatórias:**
  ```typescript
  queryClient.invalidateQueries({ queryKey: queryKeys.tracking.byMovie(movieId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.tracking.library({}) });
  // Se o filme foi favoritado/desfavoritado:
  if (currentUser?.nickname) {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.profile(currentUser.nickname) });
  }
  ```

---

## 7. Matriz de Endpoints da API

| Método | Rota | Autenticado | Request Body / Query Params | Resposta de Sucesso | Status HTTP |
| :--- | :--- | :---: | :--- | :--- | :---: |
| `POST` | `/auth/register` | Não | Body: `RegisterPayload` | `User` | `201 Created` |
| `POST` | `/auth/login` | Não | Body: `LoginPayload` | `AuthResponse` | `200 OK` |
| `GET` | `/auth/me` | Sim | Header: `Authorization: Bearer <token>` | `User` | `200 OK` |
| `GET` | `/movies` | Não | Query: `page`, `page_size`, `search`, `genre` | `PaginatedResponse<MovieCardItem>` | `200 OK` |
| `GET` | `/movies/{id}` | Não | Path: `id` (`sk_movie_id`) | `MovieDetail` | `200 OK` |
| `GET` | `/movies/{id}/tracking` | Sim | Path: `id` | `TrackingResponse` | `200 OK` |
| `PUT` | `/movies/{id}/tracking` | Sim | Path: `id`, Body: `UpdateTrackingPayload` | `TrackingResponse` | `200 OK` |
| `DELETE` | `/movies/{id}/tracking` | Sim | Path: `id` | `{"detail": "Tracking removido"}` | `200 OK` |
| `GET` | `/movies/me/library` | Sim | Query: `status`, `is_favorite`, `page`, `page_size` | `PaginatedResponse<TrackingMovieCard>` | `200 OK` |
| `GET` | `/movies/{id}/reviews` | Não | Path: `id`, Query: `page`, `page_size` | `PaginatedResponse<ReviewItem>` | `200 OK` |
| `POST` | `/movies/{id}/reviews` | Sim | Path: `id`, Body: `CreateReviewPayload` | `ReviewItem` | `201 Created` |
| `PUT` | `/reviews/{id}` | Sim | Path: `id`, Body: `UpdateReviewPayload` | `ReviewItem` | `200 OK` |
| `DELETE` | `/reviews/{id}` | Sim | Path: `id` | `{"detail": "Review removida"}` | `200 OK` |
| `GET` | `/reviews/community/feed`| Não | Query: `page`, `page_size` | `PaginatedResponse<FeedReviewItem>` | `200 OK` |
| `GET` | `/users/{nickname}` | Não | Path: `nickname` | `PublicUserProfile` | `200 OK` |