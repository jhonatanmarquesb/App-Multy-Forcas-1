import React, { useEffect, useMemo, useState } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Sessao } from '../types';
import {
  History, Trophy, Flame, Weight, Calendar, ChevronRight, X, Dumbbell,
  Award, TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Skeleton } from '../components/Skeleton';

const fmtDataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

const fmtDataLonga = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

interface RecordePessoal {
  nome: string;
  cargaKg: number;
  data: string;
}

export const Historico: React.FC = () => {
  const { user } = useAuth();
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalheAberto, setDetalheAberto] = useState<Sessao | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'historico' | 'recordes'>('historico');

  useEffect(() => {
    if (user) fetchSessoes();
  }, [user]);

  const fetchSessoes = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'sessoes'),
        where('studentId', '==', user.uid),
        orderBy('date', 'desc')
      );
      const snap = await getDocs(q);
      setSessoes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sessao)));
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
    } finally {
      setLoading(false);
    }
  };

  // Recorde pessoal = maior carga já registrada por exercício, considerando
  // só séries que realmente foram marcadas como feitas naquele dia.
  const recordes: RecordePessoal[] = useMemo(() => {
    const melhorPorExercicio = new Map<string, RecordePessoal>();
    // varre do mais antigo pro mais novo pra "data" refletir quando o recorde foi batido
    [...sessoes].reverse().forEach((s) => {
      s.exercicios.forEach((ex) => {
        if (ex.seriesFeitas <= 0 || ex.cargaKg <= 0) return;
        const atual = melhorPorExercicio.get(ex.nome);
        if (!atual || ex.cargaKg > atual.cargaKg) {
          melhorPorExercicio.set(ex.nome, { nome: ex.nome, cargaKg: ex.cargaKg, data: s.date });
        }
      });
    });
    return Array.from(melhorPorExercicio.values()).sort((a, b) => b.cargaKg - a.cargaKg);
  }, [sessoes]);

  const totalVolumeGeral = useMemo(
    () => sessoes.reduce((sum, s) => sum + (s.volumeTotalKg || 0), 0),
    [sessoes]
  );

  if (loading) {
    return (
      <div className="p-6 pt-12 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-48" />
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  return (
    <div className="p-6 pt-12 max-w-2xl mx-auto mb-32">
      <header className="mb-6">
        <div className="text-[#FFD700] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Sua Trajetória</div>
        <h1 className="text-4xl font-display uppercase text-white leading-tight">Histórico</h1>
      </header>

      {sessoes.length === 0 ? (
        <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-[2rem] py-20 text-center px-6">
          <History size={36} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-400 text-sm font-black italic uppercase">Ainda sem treinos no histórico</p>
          <p className="text-zinc-600 text-[11px] mt-2 leading-relaxed max-w-[240px] mx-auto">
            Finalize um treino na aba "Treino" e ele aparece aqui, com tudo que você fez naquele dia.
          </p>
        </div>
      ) : (
        <>
          {/* Métricas rápidas */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4 text-center">
              <div className="font-display text-white text-2xl">{sessoes.length}</div>
              <div className="text-zinc-600 font-bold uppercase text-[8px] tracking-widest mt-1">Treinos</div>
            </div>
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4 text-center">
              <div className="font-display text-white text-2xl">{(totalVolumeGeral / 1000).toFixed(1)}t</div>
              <div className="text-zinc-600 font-bold uppercase text-[8px] tracking-widest mt-1">Volume total</div>
            </div>
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4 text-center">
              <div className="font-display text-[#FFD700] text-2xl">{recordes.length}</div>
              <div className="text-zinc-600 font-bold uppercase text-[8px] tracking-widest mt-1">Recordes</div>
            </div>
          </div>

          {/* Seletor: Histórico x Recordes */}
          <div className="flex gap-2 mb-6 p-1 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
            <button
              onClick={() => setAbaAtiva('historico')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition-colors',
                abaAtiva === 'historico' ? 'bg-[#FFD700] text-black' : 'text-zinc-500'
              )}
            >
              <History size={13} /> Treinos
            </button>
            <button
              onClick={() => setAbaAtiva('recordes')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition-colors',
                abaAtiva === 'recordes' ? 'bg-[#FFD700] text-black' : 'text-zinc-500'
              )}
            >
              <Trophy size={13} /> Recordes
            </button>
          </div>

          {abaAtiva === 'historico' ? (
            <div className="space-y-3">
              <AnimatePresence>
                {sessoes.map((s, i) => (
                  <motion.button
                    key={s.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => setDetalheAberto(s)}
                    className="w-full p-5 rounded-[1.75rem] bg-zinc-900/40 border border-zinc-800/50 hover:border-[#FFD700]/30 transition-colors flex items-center gap-4 text-left"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-black/40 border border-zinc-800 flex items-center justify-center shrink-0 text-[#FFD700]">
                      <Dumbbell size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black uppercase italic text-white truncate">{s.divisaoNome}</div>
                      <div className="flex items-center gap-3 text-zinc-500 text-[10px] font-bold uppercase tracking-wider mt-1">
                        <span className="flex items-center gap-1"><Calendar size={10} />{fmtDataCurta(s.date)}</span>
                        <span className="flex items-center gap-1"><Weight size={10} />{(s.volumeTotalKg / 1000).toFixed(1)}t</span>
                        <span className="flex items-center gap-1"><Flame size={10} className="text-[#FFD700]" />{s.streakNoDia}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-600 shrink-0" />
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="space-y-3">
              {recordes.length === 0 ? (
                <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-[2rem] py-14 text-center px-6">
                  <Award size={28} className="mx-auto text-zinc-700 mb-3" />
                  <p className="text-zinc-500 text-xs font-bold uppercase">Nenhum recorde ainda — continue treinando!</p>
                </div>
              ) : (
                recordes.map((r, i) => (
                  <motion.div
                    key={r.nome}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 flex items-center gap-4"
                  >
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center font-display text-sm shrink-0',
                      i === 0 ? 'bg-[#FFD700] text-black' : 'bg-black/40 border border-zinc-800 text-zinc-500'
                    )}>
                      {i === 0 ? <Trophy size={15} /> : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black uppercase italic text-white truncate">{r.nome}</div>
                      <div className="text-zinc-500 text-[10px] font-bold uppercase mt-0.5">Recorde em {fmtDataCurta(r.data)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display text-[#FFD700] text-lg">{r.cargaKg}</div>
                      <div className="text-zinc-600 text-[7px] font-bold uppercase tracking-widest">kg</div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Bottom sheet: detalhe completo da sessão */}
      <AnimatePresence>
        {detalheAberto && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDetalheAberto(null)}
              className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="fixed inset-x-0 bottom-0 z-[91] max-w-2xl mx-auto bg-zinc-900 border-t border-[#FFD700]/20 rounded-t-[2rem] p-6 pb-10 safe-bottom max-h-[85vh] overflow-y-auto"
            >
              <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto mb-5" />
              <div className="flex items-center justify-between mb-1">
                <div className="text-[#FFD700] text-[10px] font-black uppercase tracking-[0.2em] capitalize">{fmtDataLonga(detalheAberto.date)}</div>
                <button onClick={() => setDetalheAberto(null)} className="text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              <h3 className="text-2xl font-display uppercase text-white mb-5 leading-tight">{detalheAberto.divisaoNome}</h3>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="border border-zinc-800 bg-black/40 rounded-2xl p-3 text-center">
                  <div className="font-display text-white text-base">{(detalheAberto.volumeTotalKg / 1000).toFixed(1)}t</div>
                  <div className="text-zinc-600 font-bold uppercase text-[7px] tracking-widest mt-1">Volume</div>
                </div>
                <div className="border border-zinc-800 bg-black/40 rounded-2xl p-3 text-center">
                  <div className="font-display text-white text-base">{detalheAberto.effort}/10</div>
                  <div className="text-zinc-600 font-bold uppercase text-[7px] tracking-widest mt-1">Esforço</div>
                </div>
                <div className="border border-zinc-800 bg-black/40 rounded-2xl p-3 text-center">
                  <div className="font-display text-white text-base flex items-center justify-center gap-1">
                    <Flame size={13} className="text-[#FFD700]" />{detalheAberto.streakNoDia}
                  </div>
                  <div className="text-zinc-600 font-bold uppercase text-[7px] tracking-widest mt-1">Sequência</div>
                </div>
              </div>

              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3">Exercícios</div>
              <div className="space-y-2.5 mb-4">
                {detalheAberto.exercicios.map((ex, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-zinc-800/50">
                    <div className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      ex.seriesFeitas === ex.seriesTotal ? 'bg-[#FFD700]' : 'bg-zinc-700'
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-sm truncate">{ex.nome}</div>
                      <div className="text-zinc-500 text-[10px] font-bold uppercase">{ex.seriesFeitas}/{ex.seriesTotal} séries · {ex.reps} reps</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display text-white text-sm">{ex.cargaKg}<span className="text-zinc-600 text-[9px] ml-0.5">kg</span></div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setDetalheAberto(null)}
                className="w-full py-4 bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-700 transition-colors"
              >
                Fechar
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
