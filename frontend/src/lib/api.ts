import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/authStore";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Interceptor de Requisição: Injeta Bearer token e mapeia rotas com o backend
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Compatibilidade com endpoints do backend:
    // Redireciona /reviews/community/feed para /feed no FastAPI
    if (config.url === "/reviews/community/feed" || config.url?.startsWith("/reviews/community/feed")) {
      config.url = config.url.replace("/reviews/community/feed", "/feed");
    }

    // Se o frontend solicitar DELETE /reviews/:id com movie_id informado
    if (
      config.method?.toLowerCase() === "delete" &&
      config.url?.startsWith("/reviews/") &&
      !config.url?.startsWith("/reviews/community")
    ) {
      const movieId = config.params?.movie_id;
      if (movieId) {
        config.url = `/movies/${movieId}/reviews`;
        delete config.params.movie_id;
      }
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Interceptor de Resposta: Normaliza dados (como generos) e trata 401
api.interceptors.response.use(
  (response) => {
    // Normaliza campo generos no retorno de detalhes de filmes caso o backend envie apenas genres
    if (response.data && typeof response.data === "object") {
      const data = response.data as Record<string, any>;
      if (Array.isArray(data.genres) && !Array.isArray(data.generos)) {
        data.generos = data.genres.map((g: any) =>
          typeof g === "object" && g !== null && "nome_genero" in g ? g.nome_genero : String(g)
        );
      }
    }
    return response;
  },
  (error: AxiosError<{ detail?: string }>) => {
    if (error.response?.status === 401) {
      const isAuthRoute =
        error.config?.url?.includes("/auth/login") ||
        error.config?.url?.includes("/auth/register");

      if (!isAuthRoute) {
        useAuthStore.getState().logout();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);
