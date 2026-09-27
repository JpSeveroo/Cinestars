import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { toast } from "sonner";
import { UserPlus, User, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { TokenResponse, User as UserType } from "@/types/auth";

const registerSchema = z
  .object({
    nickname: z
      .string()
      .min(3, "O nickname deve ter no mínimo 3 caracteres.")
      .max(50, "O nickname deve ter no máximo 50 caracteres.")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Apenas letras, números, hífen (-) e underline (_) são permitidos."
      ),
    email: z
      .string()
      .min(1, "Informe seu endereço de e-mail.")
      .email("Informe um e-mail válido."),
    password: z
      .string()
      .min(6, "A senha deve ter no mínimo 6 caracteres.")
      .max(72, "A senha pode ter no máximo 72 caracteres."),
    confirmPassword: z
      .string()
      .min(1, "Confirme sua senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { isAuthenticated, setAuth } = useAuthStore();
  const navigate = useNavigate();

  // Redireciona se o usuário já estiver logado
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nickname: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setApiError(null);
    try {
      // 1. Cadastra o novo usuário cinéfilo na API apenas com dados essenciais
      await api.post<UserType>("/auth/register", {
        nickname: data.nickname.trim(),
        email: data.email.trim(),
        password: data.password,
      });

      // 2. Realiza o login automático imediatamente para experiência contínua
      const loginResponse = await api.post<TokenResponse>("/auth/login", {
        login: data.nickname.trim(),
        password: data.password,
      });

      const { access_token } = loginResponse.data;

      // 3. Busca os dados de sessão do usuário cadastrado
      const meResponse = await api.get<UserType>("/auth/me", {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      setAuth(access_token, meResponse.data);

      toast.success(`Conta criada com sucesso! Bem-vindo ao CineStars, ${meResponse.data.nickname}!`);
      navigate("/", { replace: true });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const errorDetail = error.response?.data?.detail;
        let message = "Erro ao realizar cadastro.";

        if (typeof errorDetail === "string") {
          message = errorDetail;
        } else if (Array.isArray(errorDetail) && errorDetail.length > 0) {
          message = errorDetail[0].msg || message;
        } else if (error.response?.status === 409) {
          message = "Este nickname ou e-mail já está sendo utilizado.";
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
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-text">
            Junte-se ao CineStars
          </h1>
          <p className="text-xs text-muted">
            Crie sua conta para acompanhar filmes, registrar sua estante e avaliar obras.
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
            id="nickname"
            label="Nickname"
            placeholder="ex: kubrick_fan"
            hint="Mínimo 3 caracteres, sem espaços"
            disabled={isSubmitting}
            leftIcon={<User className="w-4 h-4" />}
            error={errors.nickname?.message}
            {...register("nickname")}
          />

          <Input
            id="email"
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            disabled={isSubmitting}
            leftIcon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            {...register("email")}
          />

          <Input
            id="password"
            label="Senha"
            type={showPassword ? "text" : "password"}
            placeholder="Mínimo 6 caracteres"
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

          <Input
            id="confirmPassword"
            label="Confirmar Senha"
            type={showPassword ? "text" : "password"}
            placeholder="Repita sua senha"
            disabled={isSubmitting}
            leftIcon={<Lock className="w-4 h-4" />}
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2"
            isLoading={isSubmitting}
          >
            Criar conta
          </Button>
        </form>

        <div className="text-center text-xs text-muted pt-2 border-t border-line">
          <span>Já possui uma conta? </span>
          <Link to="/login" className="text-gold font-medium hover:underline">
            Faça login aqui
          </Link>
        </div>
      </div>
    </div>
  );
};
