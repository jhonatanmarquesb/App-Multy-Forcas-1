import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, ClipboardList, Search, Zap, Clock, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface CollaboratorDashboardProps {
  onNavigate?: (tab: string) => void;
}

export const CollaboratorDashboard: React.FC<CollaboratorDashboardProps> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    const fetchActivities = async () => {
      const q = query(
        collection(db, 'activities'),
        where('teacherId', '==', profile?.id || profile?.uid || ''),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      setRecentActivities(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    if (profile) fetchActivities();
  }, [profile]);

  return (
    <div className="p-6 pt-12 max-w-4xl mx-auto">
      <header className="mb-10">
        <div className="text-[#FFD700] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Espaço de Trabalho</div>
        <h1 className="text-3xl font-black italic uppercase text-white leading-tight">Coach Portal</h1>
        <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Pronto para a evolução hoje, {profile?.name}?</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate?.('agenda')}
          className="lg:col-span-2 bg-zinc-900/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-zinc-800/50 shadow-premium relative overflow-hidden group cursor-pointer"
        >
          <div className="absolute -right-8 -top-8 bg-[#FFD700]/5 w-40 h-40 rounded-full blur-3xl group-hover:bg-[#FFD700]/15 transition-all duration-700" />
          <div className="p-4 bg-black/50 border border-zinc-800 rounded-2xl w-fit mb-6 text-[#FFD700]">
            <Calendar size={32} strokeWidth={2.5} />
          </div>
          <h3 className="text-2xl font-black italic uppercase text-white mb-2">Gestão da Agenda</h3>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">Acesse a agenda central para atribuir novas consultas, avaliações físicas e acompanhar o cronograma da unidade.</p>
          
          <div className="bg-[#FFD700] text-black font-black uppercase tracking-widest text-[10px] py-4 px-8 rounded-2xl inline-flex items-center gap-3 shadow-xl shadow-[#FFD700]/5 group-hover:bg-yellow-400 transition-colors">
            ABRIR AGENDA <ClipboardList size={16} strokeWidth={3} />
          </div>
        </motion.div>

        <div className="space-y-6">
          <div className="bg-zinc-900/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-zinc-800/50 shadow-premium">
            <h3 className="text-lg font-black italic uppercase text-white mb-6 flex items-center gap-3">
              <Zap size={20} className="text-[#FFD700]" />
              Atividade
            </h3>
            <div className="space-y-4">
              {recentActivities.map(act => (
                <div key={act.id} className="bg-black/30 p-4 rounded-2xl border border-zinc-900/50 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="text-[8px] font-black text-[#FFD700] uppercase tracking-widest leading-none">Feedback Aluno</div>
                    <div className="text-[8px] text-zinc-600 font-bold leading-none">
                       {act.timestamp?.toDate ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(act.timestamp.toDate()) : 'Agora'}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-white italic leading-tight">{act.message}</p>
                  {act.effort && (
                    <div className="flex gap-1">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className={cn("h-1 flex-1 rounded-full", i < act.effort ? "bg-[#FFD700]" : "bg-zinc-800")} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {recentActivities.length === 0 && (
                <div className="py-10 text-center opacity-20">
                   <Clock size={48} className="mx-auto mb-2 text-zinc-700" />
                   <p className="text-[10px] font-black uppercase text-zinc-500">Nenhuma atividade hoje</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
