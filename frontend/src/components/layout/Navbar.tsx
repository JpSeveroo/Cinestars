import React, { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Star, Film, Library, User as UserIcon, LogOut, Menu, X, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fecha o dropdown de usuário ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    toast.info("Você saiu da sua conta.");
    navigate("/");
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.92rem] font-medium rounded-[8px] transition-colors ${
      isActive
        ? "text-gold bg-gold/10 font-semibold"
        : "text-muted hover:text-text hover:bg-card/50"
    }`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-line bg-bg/95 backdrop-blur-md">
      <div className="max-w-container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Marca / Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-text hover:text-gold transition-colors group"
        >
          <div className="w-8 h-8 rounded-[8px] bg-card border border-line flex items-center justify-center text-gold group-hover:border-gold/40 transition-colors">
            <Star className="w-4 h-4 fill-gold stroke-gold" />
          </div>
          <span className="font-serif text-[1.4rem] font-semibold tracking-tight text-text">
            Cine<span className="text-gold">Stars</span>
          </span>
        </Link>

        {/* Links Centrais (Desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/" end className={navLinkClass}>
            <span>Início</span>
          </NavLink>
          <NavLink to="/movies" className={navLinkClass}>
            <Film className="w-4 h-4" />
            <span>Catálogo</span>
          </NavLink>
          <NavLink to="/library" className={navLinkClass}>
            <Library className="w-4 h-4" />
            <span>Minha Estante</span>
          </NavLink>
        </nav>

        {/* Área de Autenticação / Perfil (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-pill border border-line hover:border-gold/40 bg-card/60 transition-colors focus:outline-none focus:ring-1 focus:ring-gold"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.nickname}
                    className="w-7 h-7 rounded-full object-cover border border-gold/40"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-card border border-gold text-gold font-serif font-semibold text-xs flex items-center justify-center">
                    {user.nickname.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-[0.88rem] font-medium text-text max-w-[120px] truncate">
                  {user.nickname}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted" />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-card border border-line rounded-[10px] shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3.5 py-2 border-b border-line">
                    <p className="text-[0.75rem] text-muted">Conectado como</p>
                    <p className="text-[0.88rem] font-semibold text-text truncate">
                      @{user.nickname}
                    </p>
                  </div>

                  <Link
                    to={`/users/${user.nickname}`}
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-[0.88rem] text-muted hover:text-text hover:bg-bg2 transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-gold" />
                    <span>Meu Perfil</span>
                  </Link>

                  <Link
                    to="/library"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-[0.88rem] text-muted hover:text-text hover:bg-bg2 transition-colors"
                  >
                    <Library className="w-4 h-4 text-teal" />
                    <span>Minha Estante</span>
                  </Link>

                  <div className="my-1 border-t border-line" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[0.88rem] text-danger hover:bg-danger/10 transition-colors text-left font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair da conta</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Entrar
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Criar conta
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Botão Hambúrguer Mobile */}
        <div className="flex md:hidden items-center">
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="Abrir menu de navegação"
            className="p-2 rounded-[8px] text-muted hover:text-text hover:bg-card border border-line focus:outline-none focus:ring-1 focus:ring-gold"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Menu Responsivo Mobile */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-line bg-bg2 px-4 py-4 space-y-3">
          <nav className="flex flex-col space-y-1">
            <Link
              to="/"
              onClick={() => setIsMenuOpen(false)}
              className="px-3 py-2 text-[0.92rem] font-medium text-text rounded-[8px] hover:bg-card"
            >
              Início
            </Link>
            <Link
              to="/movies"
              onClick={() => setIsMenuOpen(false)}
              className="px-3 py-2 text-[0.92rem] font-medium text-text rounded-[8px] hover:bg-card"
            >
              Catálogo de Filmes
            </Link>
            <Link
              to="/library"
              onClick={() => setIsMenuOpen(false)}
              className="px-3 py-2 text-[0.92rem] font-medium text-text rounded-[8px] hover:bg-card"
            >
              Minha Estante
            </Link>
            {isAuthenticated && user && (
              <Link
                to={`/users/${user.nickname}`}
                onClick={() => setIsMenuOpen(false)}
                className="px-3 py-2 text-[0.92rem] font-medium text-text rounded-[8px] hover:bg-card"
              >
                Meu Perfil (@{user.nickname})
              </Link>
            )}
          </nav>

          <div className="pt-2 border-t border-line">
            {isAuthenticated && user ? (
              <Button
                variant="danger"
                size="sm"
                className="w-full justify-center"
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
              >
                <LogOut className="w-4 h-4" />
                <span>Sair da conta</span>
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full">
                    Entrar
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full">
                    Cadastrar
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
