import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';
import { motion } from 'motion/react';
import { Eye, EyeOff, Lock, User } from 'lucide-react';

// ---------------------------------------------------------------------------
// SEGURANÇA: as credenciais de bootstrap ("00000000000" / "admin123") que
// existiam aqui foram REMOVIDAS. Elas ficavam visíveis no JavaScript do site
// e permitiam que qualquer pessoa criasse uma conta e entrasse no sistema.
// Contas devem ser criadas apenas pelo painel do admin ou pelo Firebase Console.
// ---------------------------------------------------------------------------

export const Login: React.FC = () => {
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  // Máscara de CPF ao digitar: 000.000.000-00
  const handleCpfChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    const masked = digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setCpf(masked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(cpf, password);
    } catch (err: any) {
      setError(err.message || 'CPF ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Luzes de fundo */}
      <div className="absolute top-[-10%] right-[-10%] w-[45%] h-[45%] bg-[#FFD700]/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[35%] h-[35%] bg-[#FFD700]/5 blur-[100px] rounded-full" />

      {/* Lema da casa, gigante e quase invisível atrás do card */}
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
      >
        <span className="font-display uppercase text-[26vw] leading-none text-white/[0.02] whitespace-nowrap">
          Força
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-[#FFD700]/20 p-8 sm:p-12 rounded-[2.5rem] shadow-[0_0_50px_rgba(255,215,0,0.05)]">
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 140, damping: 16 }}
            className="text-center mb-10"
          >
            <Logo size="lg" />
            <p className="mt-4 text-zinc-500 text-[11px] font-bold tracking-[0.3em] uppercase">Portal do Atleta</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="login-cpf" className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-bold ml-1">CPF</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                  <User size={18} />
                </div>
                <input
                  id="login-cpf"
                  type="text"
                  inputMode="numeric"
                  autoComplete="username"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => handleCpfChange(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-black/50 border border-zinc-800 rounded-2xl text-white placeholder-zinc-700 focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700]/30 transition-all font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="login-pass" className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-bold ml-1">Senha de Acesso</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                  <Lock size={18} />
                </div>
                <input
                  id="login-pass"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-12 py-4 bg-black/50 border border-zinc-800 rounded-2xl text-white placeholder-zinc-700 focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700]/30 transition-all font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-[#FFD700] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-xs bg-red-500/5 p-4 rounded-xl border border-red-500/20 flex items-center gap-2"
                role="alert"
              >
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="w-full bg-[#FFD700] text-black font-display uppercase tracking-[0.15em] py-5 rounded-2xl shadow-xl shadow-[#FFD700]/10 hover:bg-yellow-400 transition-colors text-base flex justify-center items-center gap-3 disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-[3px] border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                'Entrar'
              )}
            </motion.button>
          </form>

          <div className="mt-10 flex flex-col items-center gap-3">
            <p className="text-zinc-500 text-[11px] font-medium uppercase tracking-wider">
              Ainda não tem acesso?
            </p>
            <a
              href="https://wa.me/556133876200?text=Ol%C3%A1!%20Quero%20acessar%20o%20aplicativo%20da%20Multy%20For%C3%A7as"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white text-xs font-bold hover:text-[#FFD700] transition-colors border-b border-white/10 hover:border-[#FFD700]/40 pb-1"
            >
              Fale com a Recepção
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
