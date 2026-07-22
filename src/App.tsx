import React, { useState, useEffect, useRef } from 'react';
import { LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { ResetPassword } from './pages/ResetPassword';
import { BottomNav } from './components/BottomNav';
import { WhatsAppFAB } from './components/WhatsAppFAB';
import { ToastProvider } from './lib/toast';
import { ConfettiHost } from './components/Confetti';

// Pages
import { Ranking } from './pages/Ranking';
import { Evolucao } from './pages/Evolucao';
import { Schedule } from './pages/Schedule';
import { WorkoutView } from './pages/WorkoutView';
import { AdminDashboard } from './pages/AdminDashboard';
import { CollaboratorDashboard } from './pages/CollaboratorDashboard';
import { StudentSearch } from './pages/StudentSearch';

// Aba inicial sensata por cargo — staff cai na gestão, aluno cai no treino.
const defaultTabForRole = (role?: string) => {
  if (role === 'admin' || role === 'colaborador') return 'dashboard';
  if (role === 'professor') return 'search';
  return 'workout';
};

const AppContent = () => {
  const { user, profile, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('');

  // CORREÇÃO: antes este efeito rodava toda vez que o objeto `profile` mudava
  // de referência — o que acontece em segundo plano várias vezes por sessão
  // (token de notificação, streak, check-in...). Cada uma dessas atualizações
  // silenciosas resetava a navegação de volta para "workout", dando a
  // impressão de que o AdminDashboard "não abria". Agora só define a aba
  // inicial UMA VEZ, quando o perfil carrega pela primeira vez.
  const tabInitialized = useRef(false);
  useEffect(() => {
    if (profile && !tabInitialized.current) {
      tabInitialized.current = true;
      setActiveTab(defaultTabForRole(profile.role));
    }
  }, [profile]);

  // Se a pessoa deslogar e outra logar na mesma aba, reseta o controle.
  useEffect(() => {
    if (!user) tabInitialized.current = false;
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (profile?.primeiro_acesso) {
    return <ResetPassword />;
  }

  const renderContent = () => {
    const role = profile?.role;

    switch (activeTab) {
      case 'dashboard':
        if (role === 'admin' || role === 'professor' || role === 'colaborador') return <AdminDashboard initialTab="membros" />;
        return <WorkoutView />;
      case 'users':
        return (role === 'admin' || role === 'professor' || role === 'colaborador') ? <AdminDashboard initialTab="membros" /> : <WorkoutView />;
      case 'search':
        return (role === 'admin' || role === 'professor') ? <StudentSearch /> : <WorkoutView />;
      case 'workout':
        return <WorkoutView />;
      case 'ranking':
        return <Ranking />;
      case 'evolucao':
        return <Evolucao />;
      case 'agenda':
        if (role === 'admin' || role === 'colaborador') return <AdminDashboard initialTab="agenda" />;
        return <Schedule />;
      default:
        if (['admin', 'colaborador', 'professor'].includes(role || '')) {
          if (role === 'admin' || role === 'colaborador') return <AdminDashboard />;
          if (role === 'professor') return <AdminDashboard initialTab="treinos" />;
          return <CollaboratorDashboard onNavigate={setActiveTab} />;
        }
        return <WorkoutView />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-yellow-400 selection:text-black">
      {/* Header fixo — respeita a área do notch em celulares com entalhe */}
      <header
        className="fixed top-0 left-0 right-0 h-16 bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-800 flex items-center justify-between px-4 sm:px-6 z-50"
        style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(4rem + env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 shrink-0 bg-zinc-950 border border-[#FFD700] rounded-lg flex items-center justify-center font-black text-[#FFD700] text-[10px]">
            MF
          </div>
          <span className="text-sm font-display uppercase tracking-wide text-white truncate">Multy Forças</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[9px] font-bold uppercase text-zinc-500 leading-none">Bem-vindo,</p>
            <p className="text-[11px] font-black uppercase tracking-tight truncate max-w-[140px]">{profile?.name.split(' ')[0]}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={logout}
            className="flex items-center gap-2 p-2 bg-zinc-800/80 hover:bg-red-950/30 text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-500/50 rounded-xl transition-colors group"
          >
            <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-[10px] font-black uppercase pr-1 hidden xs:inline">Sair</span>
          </motion.button>
        </div>
      </header>

      <main
        className="pb-28"
        style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top))' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      <WhatsAppFAB />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
        <ConfettiHost />
      </AuthProvider>
    </ToastProvider>
  );
}
