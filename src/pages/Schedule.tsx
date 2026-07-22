import React, { useState, useEffect } from 'react';
import { Calendar, Apple, ClipboardList, ExternalLink, Clock, CreditCard, Eye, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { handleFirestoreError } from '../lib/firestore-errors';
import { OperationType } from '../types';

export const Schedule: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ativos' | 'historico'>('ativos');
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState<any | null>(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'agendamentos'),
          where('studentId', '==', user.uid),
          orderBy('date', 'asc')
        );
        const snapshot = await getDocs(q);
        setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'agendamentos');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [user]);

  const upcomingAppointments = appointments.filter(app => new Date(app.date) >= new Date());
  const pastAppointments = appointments
    .filter(app => new Date(app.date) < new Date())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  const displayAppointments = activeTab === 'ativos' ? upcomingAppointments : pastAppointments;

  return (
    <div className="p-6 pt-12 max-w-2xl mx-auto">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <div className="text-[#FFD700] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Planejamento</div>
          <h1 className="text-3xl font-black italic uppercase text-white leading-tight">Minha Agenda</h1>
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Controle de sessões</p>
        </div>

        <div className="flex p-1 bg-zinc-900 rounded-xl border border-zinc-800">
          <button 
            onClick={() => setActiveTab('ativos')}
            className={cn(
              "px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
              activeTab === 'ativos' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-white"
            )}
          >
            Próximos
          </button>
          <button 
            onClick={() => setActiveTab('historico')}
            className={cn(
              "px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
              activeTab === 'historico' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-white"
            )}
          >
            Histórico
          </button>
        </div>
      </header>

      <div className="space-y-6 mb-32">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Carregando seus compromissos...</p>
          </div>
        ) : displayAppointments.length > 0 ? (
          displayAppointments.map((app: any) => {
            const dateObj = new Date(app.date);
            const formattedDate = dateObj.toLocaleDateString('pt-BR');
            const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => activeTab === 'historico' ? setSelectedHistoryDetail(app) : null}
                className={cn(
                  "bg-zinc-900/40 backdrop-blur-md p-6 rounded-[2rem] border border-zinc-800/50 relative overflow-hidden group",
                  activeTab === 'historico' && "opacity-60 cursor-pointer hover:bg-zinc-800 transition-colors"
                )}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-black border border-zinc-800 text-[#FFD700]">
                    {app.services?.includes('Consulta Nutricional') ? <Apple size={20} /> : <ClipboardList size={20} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-black italic uppercase text-white">{app.services?.join(' & ') || 'Consulta'}</h3>
                      <div className="flex items-center gap-2">
                        {activeTab === 'historico' && <Eye size={14} className="text-[#FFD700] group-hover:scale-110 transition-transform" />}
                        <div className={cn(
                          "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md border",
                          activeTab === 'historico' 
                            ? "bg-zinc-800 border-zinc-700 text-zinc-500"
                            : (app.paymentStatus === 'Pago' 
                              ? "bg-green-500/10 border-green-500/20 text-green-500" 
                              : "bg-red-500/10 border-red-500/20 text-red-500")
                        )}>
                          {activeTab === 'historico' ? 'REALIZADO' : app.paymentStatus}
                        </div>
                      </div>
                    </div>
                    {app.observation && (
                      <p className="text-[10px] text-zinc-500 font-medium italic mt-1 leading-relaxed">{app.observation}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-800/50">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-[#FFD700]" />
                    <span className="text-xs font-black text-white">{formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-[#FFD700]" />
                    <div className="text-xs font-black text-white bg-black/50 px-3 py-1 rounded-lg border border-zinc-800">
                      {formattedTime}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="bg-zinc-900/20 border border-dashed border-zinc-800 rounded-[2.5rem] p-12 text-center">
            <Calendar size={40} className="mx-auto text-zinc-800 mb-4" />
            <p className="text-zinc-500 text-sm font-medium italic">
              {activeTab === 'ativos' 
                ? "Você não possui agendamentos confirmados para os próximos dias."
                : "Você ainda não possui histórico de consultas realizadas."}
            </p>
          </div>
        )}

        {/* Modal de Detalhes da Consulta (Student Read-Only) */}
        <AnimatePresence>
          {selectedHistoryDetail && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedHistoryDetail(null)}
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 40 }}
                className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl"
              >
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="text-[#FFD700] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Meu Histórico</div>
                      <h2 className="text-xl font-black italic uppercase text-white leading-tight">Detalhes</h2>
                    </div>
                    <button 
                      onClick={() => setSelectedHistoryDetail(null)}
                      className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-500"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-5">
                    <div className="bg-black/40 p-5 rounded-3xl border border-zinc-800/50 flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#FFD700] rounded-xl flex items-center justify-center text-black">
                        {selectedHistoryDetail.services?.includes('Consulta Nutricional') ? <Apple size={20} /> : <ClipboardList size={20} />}
                      </div>
                      <div>
                        <div className="text-[8px] text-zinc-500 font-black uppercase mb-0.5">Realizado em</div>
                        <div className="text-sm font-black text-white italic uppercase truncate">
                          {new Date(selectedHistoryDetail.date).toLocaleDateString('pt-BR')} às {new Date(selectedHistoryDetail.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[8px] text-zinc-600 font-black uppercase tracking-widest mb-2 ml-1">Serviços</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedHistoryDetail.services?.map((s: string) => (
                          <span key={s} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-[9px] font-black text-zinc-400 uppercase italic">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[8px] text-zinc-600 font-black uppercase tracking-widest mb-2 ml-1">Minhas Observações</div>
                      <div className="bg-black/30 p-4 rounded-xl border border-zinc-800/50">
                        <p className="text-[11px] text-zinc-400 font-medium leading-relaxed italic">
                          {selectedHistoryDetail.observation || 'Nenhuma observação registrada para esta consulta.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedHistoryDetail(null)}
                    className="w-full mt-8 py-4 bg-[#FFD700] text-black rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
                  >
                    Entendido
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="bg-zinc-900/50 border border-zinc-800/50 p-8 rounded-[2.5rem] relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <ExternalLink size={14} className="text-blue-400" />
              </div>
              <h4 className="font-black text-white text-[11px] uppercase tracking-widest italic">Aviso de Agendamento</h4>
            </div>
            <p className="text-zinc-500 text-xs leading-relaxed font-medium">
              Para novos agendamentos, remarcações ou cancelamentos, por favor, entre em contato com a <span className="text-white">recepção da academia</span> ou fale diretamente com seu <span className="text-white">avaliador/nutricionista</span>.
            </p>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
        </div>

        <div className="bg-black border border-zinc-900 p-6 rounded-[2rem] flex items-start gap-4">
          <div className="p-2 bg-[#FFD700]/5 rounded-lg">
            <Calendar size={18} className="text-[#FFD700]" />
          </div>
          <div>
            <h4 className="font-black text-[#FFD700] text-xs uppercase tracking-widest mb-1 italic">Protocolo Elite</h4>
            <p className="text-zinc-600 text-[10px] leading-snug font-medium">
              As avaliações e consultas são sincronizadas com o Google Agenda institucional da Multy Forças para maior precisão e controle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
