import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';
import { motion } from 'motion/react';
import { Lock, CheckCircle } from 'lucide-react';
import { updatePassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

export const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { updateProfile, profile } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      // 1. Atualizar senha oficialmente no Firebase Auth
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
      } else {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      // 2. Marcar primeiro acesso como concluído no Firestore
      await updateProfile({ 
        primeiro_acesso: false 
      });

      // 3. Sucesso!
    } catch (err: any) {
      console.error(err);
      setError('Erro ao atualizar senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#FFD700]/5 blur-[120px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-[#FFD700]/20 p-8 sm:p-12 rounded-[2.5rem] shadow-premium">
          <div className="mb-10 text-center">
            <Logo size="md" />
            <h2 className="text-white text-2xl font-black italic uppercase mt-8">Primeiro Acesso</h2>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mt-2">Segurança em primeiro lugar elite.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-bold ml-1">Nova Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-black/50 border border-zinc-800 rounded-2xl text-white placeholder-zinc-700 focus:outline-none focus:border-[#FFD700] transition-all font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-bold ml-1">Confirmar Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                  <CheckCircle size={18} />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-black/50 border border-zinc-800 rounded-2xl text-white placeholder-zinc-700 focus:outline-none focus:border-[#FFD700] transition-all font-medium"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider ml-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FFD700] text-black font-black uppercase tracking-widest py-5 rounded-2xl shadow-xl shadow-[#FFD700]/10 hover:bg-yellow-400 active:scale-[0.98] transition-all text-sm flex justify-center items-center gap-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-[3px] border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                'Ativar minha Conta'
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
