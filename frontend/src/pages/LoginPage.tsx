import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { toast } from "sonner";
import { LogIn, User, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { TokenResponse, User as UserType } from "@/types/auth";

const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, "Informe seu e-mail ou nickname."),
  password: z
    .string()
    .min(1, "Informe sua senha."),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { isAuthenticated, setAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Redireciona se o usuário já estiver autenticado
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/";
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    try {
      // 1. Autenticação na API FastAPI: aceita email ou nickname no campo login
      const loginResponse = await api.post<TokenResponse>("/auth/login", {
        login: data.identifier.trim(),
        password: data.password,
      });

      const { access_token } = loginResponse.data;

      // 2. Busca o perfil do usuário logado usando o token recém-obtido
      const meResponse = await api.get<UserType>("/auth/me", {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      const userData = meResponse.data;

      // 3. Persiste sessão no Zustand e localStorage
      setAuth(access_token, userData);

      toast.success(`Bem-vindo de volta, ${userData.nickname}!`);
      navigate(from, { replace: true });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const errorDetail = error.response?.data?.detail;
        let message = "Falha ao realizar login. Verifique seus dados.";

        if (typeof errorDetail === "string") {
          message = errorDetail;
        } else if (Array.isArray(errorDetail) && errorDetail.length > 0) {
          message = errorDetail[0].msg || message;
        } else if (error.response?.status === 401) {
          message = "Credenciais inválidas. Verifique seu login e senha.";
        }

        setApiError(message);
        toast.error(message);
      } else {
        const generic = "Ocorreu um erro inesperado ao conectar ao servidor.";
        setApiError(generic);
        toast.error(generic);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-14rem)] py-8">
      <div className="w-full max-w-md bg-card/90 border border-line rounded-[10px] p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mx-auto">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-text">
            Entrar no CineStars
          </h1>
          <p className="text-xs text-muted">
            Informe seu e-mail ou nickname para acessar sua estante cinematográfica.
          </p>
        </div>

        {apiError && (
          <div className="p-3 rounded-[8px] bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            id="identifier"
            label="E-mail ou Nickname"
            placeholder="ex: cinefilo ou usuario@email.com"
            disabled={isSubmitting}
            leftIcon={<User className="w-4 h-4" />}
            error={errors.identifier?.message}
            {...register("identifier")}
          />

          <Input
            id="password"
            label="Senha"
            type={showPassword ? "text" : "password"}
            placeholder="Sua senha secreta"
            disabled={isSubmitting}
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-muted hover:text-text transition-colors p-1"
                aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            error={errors.password?.message}
            {...register("password")}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2"
            isLoading={isSubmitting}
          >
            Entrar
          </Button>
        </form>

        <div className="text-center text-xs text-muted pt-2 border-t border-line">
          <span>Ainda não tem conta? </span>
          <Link to="/register" className="text-gold font-medium hover:underline">
            Cadastre-se gratuitamente
          </Link>
        </div>
      </div>
    </div>
  );
};
