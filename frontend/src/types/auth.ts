export interface User {
  id: string | number;
  email: string;
  nickname: string;
  avatar_url: string | null;
  bio: string | null;
  is_admin?: boolean;
  created_at: string;
}

export interface LoginPayload {
  identifier?: string;
  login?: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  nickname: string;
  password: string;
  avatar_url?: string | null;
  bio?: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer" | string;
}

export interface AuthResponse {
  access_token: string;
  token_type: "bearer" | string;
  user?: User;
}
