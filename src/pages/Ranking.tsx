import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { Trophy, Flame, Medal, Crown, RotateCcw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../lib/toast';
import { RankingSkeleton } from '../components/Skeleton';

export const Ranking: React.FC = () => {
  const [rankingUsers, setRankingUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'aluno'),
        orderBy('treinosConcluidos', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const ranking = querySnapshot.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile));
      setRankingUsers(ranking);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Zera o ranking de TODOS os alunos. Só admins veem o botão e as regras do
  // Firestore garantem que só admins conseguem executar. Agora com modal de
  // confirmação (antes era uma sequência de alert()) e sem recarregar a página.
  const resetarRanking = async () => {
    if (isResetting) return;
    setIsResetting(true);
    try {
      const alunosQuery = query(collection(db, 'users'), where('role', '==', 'aluno'));
      const snapshot = await getDocs(alunosQuery);

      if (snapshot.empty) {
        toast('Nenhum aluno encontrado para zerar.', 'info');
        return;
      }

      // Firestore limita 500 operações por batch — dividimos por segurança
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += 450) {
        const batch = writeBatch(db);
        docs.slice(i, i + 450).forEach((d) => {
          batch.update(d.ref, { treinosConcluidos: 0, ultimoTreinoData: null, streak: 0 });
        });
        await batch.commit();
      }

      toast(`Ranking zerado para ${docs.length} aluno(s). Nova temporada começa agora!`, 'success');
      setShowResetModal(false);
      setLoading(true);
      await fetchRanking();
    } catch (erro: any) {
      console.error('Erro no reset:', erro);
      toast('Erro ao zerar o ranking: ' + (erro.message || 'tente novamente.'), 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const podium = rankingUsers.slice(0, 3);
  const rest = rankingUsers.slice(3);

  const isMe = (u: UserProfile) => user?.uid === u.uid || user?.uid === u.id;

  const PodiumSpot: React.FC<{ athlete?: UserProfile; place: 1 | 2 | 3 }> = ({ athlete, place }) => {
    const config = {
      1: { height: 'h-36', bg: 'bg-gradient-to-b from-[#FFD700]/25 to-[#FFD700]/5', border: 'border-[#FFD700]/50', num: 'text-[#FFD700]', delay: 0.25 },
      2: { height: 'h-24', bg: 'bg-gradient-to-b from-zinc-400/15 to-zinc-400/5', border: 'border-zinc-500/40', num: 'text-zinc-300', delay: 0.1 },
      3: { height: 'h-16', bg: 'bg-gradient-to-b from-[#CD7F32]/20 to-[#CD7F32]/5', border: 'border-[#CD7F32]/40', num: 'text-[#CD7F32]', delay: 0.4 },
    }[place];

    if (!athlete) return <div className="flex-1" />;

    const firstName = athlete.name.split(' ')[0];

    return (
      <div className="flex-1 flex flex-col items-center justify-end gap-2 min-w-0">
        {place === 1 && (
          <motion.div
            initial={{ opacity: 0, y: -12, rotate: -12 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 12 }}
          >
            <Crown size={26} className="text-[#FFD700]" fill="currentColor" />
          </motion.div>
        )}
        <div className={cn('text-center px-1 w-full', isMe(athlete) && 'text-[#FFD700]')}>
          <p className={cn('text-[11px] font-black uppercase italic truncate', isMe(athlete) ? 'text-[#FFD700]' : 'text-white')}>
            {firstName}{isMe(athlete) ? ' (você)' : ''}
          </p>
          <p className="font-display text-lg leading-none mt-0.5 text-zinc-300">
            {athlete.treinosConcluidos || 0}
            <span className="text-[8px] font-sans font-bold text-zinc-600 uppercase tracking-widest ml-1">treinos</span>
          </p>
        </div>
        <motion.div
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ delay: config.delay, type: 'spring', stiffness: 160, damping: 18 }}
          style={{ originY: 1 }}
          className={cn('w-full rounded-t-[1.25rem] border border-b-0 flex items-start justify-center pt-3', config.height, config.bg, config.border)}
        >
          <span className={cn('font-display text-3xl', config.num)}>{place}</span>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="p-6 pt-12 max-w-2xl mx-auto">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <div className="text-[#FFD700] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Multy Forças Elite</div>
          <h1 className="text-4xl font-display uppercase text-white leading-tight">Ranking</h1>
          <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.3em] mt-1 border-l-2 border-[#FFD700] pl-3 italic">Os maiores da casa</p>
        </div>
        <Trophy size={48} className="text-[#FFD700] opacity-10" />
      </header>

      {loading ? (
        <RankingSkeleton />
      ) : rankingUsers.length > 0 ? (
        <div className="mb-32">
          {/* Pódio */}
          <div className="flex items-end gap-3 mb-8 px-2 border-b border-zinc-800/80">
            <PodiumSpot athlete={podium[1]} place={2} />
            <PodiumSpot athlete={podium[0]} place={1} />
            <PodiumSpot athlete={podium[2]} place={3} />
          </div>

          {/* Demais posições */}
          <div className="space-y-3">
            {rest.map((rat, i) => {
              const index = i + 3;
              const hasTrainedToday = rat.ultimoTreinoData === today;
              const me = isMe(rat);

              return (
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.04, type: 'spring', stiffness: 260, damping: 24 }}
                  key={rat.uid || rat.id}
                  className={cn(
                    'p-5 rounded-[2rem] flex items-center gap-5 relative overflow-hidden border',
                    me
                      ? 'bg-[#FFD700]/10 border-[#FFD700] glow-pulse z-10'
                      : 'bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700 shadow-premium'
                  )}
                >
                  {me && <div className="absolute left-0 top-0 w-1.5 h-full bg-[#FFD700]" />}

                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-display shrink-0 text-xl bg-black/60 text-zinc-500 border border-zinc-800">
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={cn('font-black text-lg tracking-tight uppercase italic leading-none truncate', me ? 'text-[#FFD700]' : 'text-white')}>
                        {rat.name}
                      </div>
                      {me && (
                        <span className="bg-[#FFD700] text-black text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shrink-0">Você</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-lg border border-zinc-800/50">
                        {hasTrainedToday ? (
                          <>
                            <Flame size={12} className="text-[#FFD700]" fill="currentColor" />
                            <span className="text-[10px] font-black italic text-zinc-300">{rat.streak || 0}</span>
                          </>
                        ) : (
                          <span className="text-[10px] font-black italic text-zinc-500 uppercase tracking-tighter">Sem treino hoje</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-lg border border-zinc-800/50 text-nowrap">
                        <span className="text-[10px] font-black italic text-white leading-none">{rat.treinosConcluidos || 0}</span>
                        <span className="text-[7px] font-bold text-zinc-600 uppercase tracking-widest leading-[0.8] block">Treinos<br/>Concluídos</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Zona administrativa, discreta no rodapé */}
          {profile?.role === 'admin' && (
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="mt-10 w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-red-900/30 bg-red-950/10 text-red-500/80 hover:bg-red-950/30 hover:text-red-400 transition-colors font-black uppercase tracking-widest text-[10px]"
            >
              <RotateCcw size={14} />
              Iniciar nova temporada (zerar ranking)
            </button>
          )}
        </div>
      ) : (
        <div className="bg-zinc-900/20 border border-dashed border-zinc-800 rounded-[2.5rem] py-20 text-center mb-32">
          <Trophy size={40} className="mx-auto text-zinc-800 mb-4" />
          <p className="text-zinc-500 text-sm font-black italic uppercase tracking-widest">A temporada está começando...</p>
          <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-wider mt-2">Finalize um treino e apareça aqui.</p>
        </div>
      )}

      {/* Modal de confirmação do reset */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="bg-zinc-900 border border-red-900/40 p-8 rounded-[2.5rem] w-full max-w-sm text-center space-y-5 shadow-2xl"
            >
              <div className="w-16 h-16 mx-auto bg-red-950/40 border border-red-900/40 rounded-2xl flex items-center justify-center">
                <AlertTriangle size={28} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-display uppercase text-white leading-tight">Zerar o ranking?</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Treinos concluídos e sequências de <strong className="text-white">todos os alunos</strong> voltam a zero.
                Essa ação não pode ser desfeita.
              </p>
              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={resetarRanking}
                  disabled={isResetting}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isResetting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Sim, iniciar nova temporada</>
                  )}
                </button>
                <button
                  onClick={() => setShowResetModal(false)}
                  disabled={isResetting}
                  className="w-full py-4 bg-zinc-800 text-zinc-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
