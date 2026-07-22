import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { ResetPassword } from './pages/ResetPassword';
import { BottomNav } from './components/BottomNav';
import { WhatsAppFAB } from './components/WhatsAppFAB';
import { ToastProvider } from './lib/toast';
import { ConfettiHost } from './components/Confetti';

// Pages (to be implemented)
import { Ranking } from './pages/Ranking';
import { Evolucao } from './pages/Evolucao';
import { Schedule } from './pages/Schedule';
import { WorkoutView } from './pages/WorkoutView';
import { AdminDashboard } from './pages/AdminDashboard';
import { CollaboratorDashboard } from './pages/CollaboratorDashboard';
import { StudentSearch } from './pages/StudentSearch';

const AppContent = () => {
  const { user, profile, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('');

  // Set default tab based on profile
  React.useEffect(() => {
    if (profile) {
      // All users (including staff) now default to their own workout view
      // except if they are just admins who might not have a workout, butMF students usually do.
      // Let's default everyone to 'workout' as it is the "Elite" athlete focus.
      setActiveTab('workout');
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
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
        // Fallback based on role
        if (['admin', 'colaborador', 'professor'].includes(role || '')) {
          if (role === 'admin' || role === 'colaborador') return <AdminDashboard />;
          if (role === 'professor') return <AdminDashboard initialTab="treinos" />;
          return <CollaboratorDashboard onNavigate={setActiveTab} />;
        }
        return <WorkoutView />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-yellow-400 selection:text-black">
      {/* Global Header with Logout */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black border border-yellow-400 rounded flex items-center justify-center font-black text-yellow-400 text-[10px]">
            MF
          </div>
          <span className="text-sm font-display uppercase tracking-wide text-white">Multy Forças</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[9px] font-bold uppercase text-zinc-500 leading-none">Bem-vindo,</p>
            <p className="text-[11px] font-black uppercase tracking-tight">{profile?.name.split(' ')[0]}</p>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 p-2 bg-zinc-800 hover:bg-red-950/30 text-zinc-400 hover:text-red-500 border border-zinc-700 hover:border-red-500/50 rounded-xl transition-all group"
          >
            <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-[10px] font-black uppercase pr-1">Sair</span>
          </button>
        </div>
      </header>

      <main className="pt-16 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.15 }}
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
