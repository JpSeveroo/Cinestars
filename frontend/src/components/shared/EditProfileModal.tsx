import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, User, Image, FileText, Check, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthStore } from "@/store/authStore";
import type { UserResponse } from "@/types/auth";

export interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  nickname: string;
  initialBio?: string | null;
  initialAvatarUrl?: string | null;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  nickname,
  initialBio = "",
  initialAvatarUrl = "",
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string>(initialAvatarUrl || "");
  const [bio, setBio] = useState<string>(initialBio || "");
  const [imageError, setImageError] = useState<boolean>(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      setAvatarUrl(initialAvatarUrl || "");
      setBio(initialBio || "");
      setImageError(false);
    }
  }, [isOpen, initialBio, initialAvatarUrl]);

  // Reseta estado de erro da imagem quando a URL for modificada
  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  // Listener para fechar com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const updateMutation = useMutation({
    mutationFn: async (payload: { bio: string | null; avatar_url: string | null }) => {
      const response = await api.patch<UserResponse>("/users/me", payload);
      return response.data;
    },
    onSuccess: (updatedUser) => {
      // 1. Atualiza a store global do Zustand
      useAuthStore.getState().updateUser({
        bio: updatedUser.bio,
        avatar_url: updatedUser.avatar_url,
      });

      // 2. Invalida as queries de perfil para recarregar os dados imediatamente
      queryClient.invalidateQueries({ queryKey: queryKeys.users.profile(nickname) });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });

      // 3. Notificação e fechamento
      toast.success("Perfil atualizado com sucesso!");
      onClose();
    },
    onError: (error: any) => {
      let message = "Erro ao atualizar perfil. Verifique os dados e tente novamente.";
      if (error?.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === "string") {
          message = detail;
        } else if (Array.isArray(detail)) {
          message = detail.map((d: any) => d.msg || d.message).join(", ");
        }
      } else if (error?.message) {
        message = error.message;
      }
      toast.error(message);
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedBio = bio.trim();
    const sanitizedAvatar = avatarUrl.trim();

    if (sanitizedBio.length > 500) {
      toast.error("A biografia não pode ultrapassar 500 caracteres.");
      return;
    }

    if (sanitizedAvatar.length > 500) {
      toast.error("A URL da foto de perfil não pode ultrapassar 500 caracteres.");
      return;
    }

    updateMutation.mutate({
      bio: sanitizedBio ? sanitizedBio : null,
      avatar_url: sanitizedAvatar ? sanitizedAvatar : null,
    });
  };

  const hasAvatar = Boolean(avatarUrl.trim()) && !imageError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-card border border-line rounded-[10px] shadow-2xl p-6 space-y-5 text-left"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2 text-text">
            <User className="w-5 h-5 text-gold" />
            <h2 id="edit-profile-title" className="font-serif text-lg sm:text-xl font-semibold">
              Editar Perfil
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-text p-1 rounded-[6px] hover:bg-bg2 transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seção de Preview do Avatar */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-[8px] bg-bg2 border border-line/60">
            <div className="w-20 h-20 rounded-full bg-card border-2 border-gold/80 overflow-hidden flex items-center justify-center text-gold font-serif text-2xl font-bold flex-shrink-0 shadow-md">
              {hasAvatar ? (
                <img
                  src={avatarUrl.trim()}
                  alt={`Avatar de @${nickname}`}
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{nickname.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div className="space-y-1 text-center sm:text-left flex-1">
              <span className="text-xs font-semibold text-text block">
                Pré-visualização da Foto
              </span>
              <p className="text-[0.75rem] text-muted">
                {imageError ? (
                  <span className="text-danger flex items-center gap-1 justify-center sm:justify-start">
                    <AlertCircle className="w-3.5 h-3.5" />
                    URL da imagem inválida ou inacessível.
                  </span>
                ) : hasAvatar ? (
                  "Sua foto de perfil será exibida assim na comunidade."
                ) : (
                  "Informe uma URL pública válida abaixo para exibir sua imagem."
                )}
              </p>
            </div>
          </div>

          {/* Campo URL do Avatar */}
          <Input
            id="avatar_url_input"
            label="URL da Foto de Perfil"
            placeholder="https://exemplo.com/sua-foto.jpg"
            hint="Link direto para imagem (JPG, PNG, WebP)"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            disabled={updateMutation.isPending}
            leftIcon={<Image className="w-4 h-4 text-muted" />}
          />

          {/* Campo Biografia */}
          <div className="w-full flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-muted">
              <label htmlFor="bio-input" className="font-medium text-text-body">
                Biografia
              </label>
              <span className={bio.length > 480 ? "text-danger font-semibold" : ""}>
                {bio.length}/500
              </span>
            </div>

            <div className="relative flex items-center w-full">
              <div className="absolute left-3 top-3 text-muted pointer-events-none">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                id="bio-input"
                rows={4}
                maxLength={500}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={updateMutation.isPending}
                placeholder="Compartilhe seus diretores favoritos, gêneros preferidos ou um pouco sobre sua relação com o cinema..."
                className="w-full bg-bg2 text-text text-[0.92rem] rounded-[8px] border border-line py-[10px] pl-9 pr-3 transition-colors placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-1 focus:ring-offset-bg resize-none"
              />
            </div>
          </div>

          {/* Ações do Modal */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={updateMutation.isPending}
              className="gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
