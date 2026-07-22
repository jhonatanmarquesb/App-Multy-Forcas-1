import React from 'react';
import { Home, Search, ClipboardList, Trophy, Calendar, Settings, LogOut, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { profile, logout } = useAuth();
  
  if (!profile) return null;

  const tabs = [];

  const isAdmin = profile.role === 'admin';
  const isProfessor = profile.role === 'professor';
  const isColaborador = profile.role === 'colaborador';
  const isStudent = profile.role === 'aluno';

  // Everyone sees these core student tabs except Professors hide Agenda
  tabs.push(
    { id: 'workout', icon: ClipboardList, label: 'Treino' },
    { id: 'ranking', icon: Trophy, label: 'Ranking' }
  );

  // Evolução: alunos acompanham avaliações físicas (professores/colaboradores usam a busca/gestão)
  if (isStudent) {
    tabs.push({ id: 'evolucao', icon: TrendingUp, label: 'Evolução' });
  }

  // Agenda: Admin, Colaborador and Alunos only (Hidden for Professors)
  if (isAdmin || isColaborador || isStudent) {
    tabs.push({ id: 'agenda', icon: Calendar, label: 'Agenda' });
  }

  // Avaliações e Consultas: só o professor vê, e só as atribuídas a ele
  if (isProfessor) {
    tabs.push({ id: 'agenda', icon: Calendar, label: 'Avaliações' });
  }

  // Montar Treinos (Search): Admin and Professors only (Hidden for Collaborators)
  if (isAdmin || isProfessor) {
    tabs.push(
      { id: 'search', icon: Search, label: 'Treinos' }
    );
  }

  // Alunos (Dashboard): All staff (Admin, Professor, Colaborador) get access to the management dashboard
  if (isAdmin || isProfessor || isColaborador) {
    tabs.unshift({ id: 'dashboard', icon: Home, label: 'Alunos' });
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-zinc-900/90 backdrop-blur-xl border-t border-zinc-800 flex justify-around items-center z-50 safe-bottom"
      style={{ paddingTop: 14, paddingBottom: `calc(14px + env(safe-area-inset-bottom))` }}
    >
      {tabs.map((tab) => (
        <motion.button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          whileTap={{ scale: 0.88 }}
          className={cn(
            "tap-ripple flex flex-col items-center gap-1.5 transition-colors duration-200 relative group min-w-0 flex-1 py-1",
            activeTab === tab.id ? "text-[#FFD700]" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          {activeTab === tab.id && (
            <motion.div
              layoutId="nav-active"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="absolute -top-3.5 w-8 h-0.5 bg-[#FFD700] rounded-full blur-[2px]"
            />
          )}
          <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight truncate w-full text-center px-0.5">{tab.label}</span>
        </motion.button>
      ))}
    </nav>
  );
};
