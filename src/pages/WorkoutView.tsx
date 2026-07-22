import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Workout, WorkoutDivision, Exercise } from '../types';
import {
  Flame, ClipboardList, UserCheck, Clock, Weight, Trophy, Zap, Timer, X,
  Plus, Minus, ChevronRight, Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from '../lib/toast';
import { fireConfetti } from '../components/Confetti';
import { WorkoutSkeleton } from '../components/Skeleton';

// Vibração curta (celular): micro-feedback tátil em cada interação relevante.
const buzz = (pattern: number | number[]) => {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  } catch { /* alguns navegadores bloqueiam — ignorar */ }
};

const FRASES_DO_DIA = [
  'Constância vence talento.',
  'O peso não levanta sozinho.',
  'Um treino de cada vez.',
  'Disciplina é liberdade.',
  'Você contra você de ontem.',
];

// "4" -> 4, "4x" -> 4, "" -> 0. Ficha antiga guarda séries como texto livre.
const parseInt0 = (v?: string | number) => {
  if (typeof v === 'number') return v;
  const n = parseInt(String(v || '0').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};
const parseFloatLoose = (v?: string | number) => {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v || '0').replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
// "90" ou "90s" ou "1min" -> segundos
const parseRestSeconds = (v?: string) => {
  if (!v) return 0;
  const s = v.toLowerCase();
  const n = parseFloatLoose(s);
  if (s.includes('min')) return Math.round(n * 60);
  return Math.round(n);
};

export const WorkoutView: React.FC = () => {
  const { user, profile, updateProfile } = useAuth();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [activeTab, setActiveTab] = useState<WorkoutDivision>('A');
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [showEffortModal, setShowEffortModal] = useState(false);
  const [effortScore, setEffortScore] = useState(5);
  const [sheetExercise, setSheetExercise] = useState<Exercise | null>(null);
  const [restSeconds, setRestSeconds] = useState(0);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restBaseRef = useRef(0);

  const fraseDoDia = FRASES_DO_DIA[new Date().getDate() % FRASES_DO_DIA.length];

  useEffect(() => {
    if (user) fetchLatestWorkout();
  }, [user]);

  // Timer de descanso: conta regressivo, vibra ao zerar, limpa sozinho.
  useEffect(() => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    if (restSeconds <= 0) return;
    restTimerRef.current = setInterval(() => {
      setRestSeconds((r) => {
        if (r <= 1) {
          buzz([20, 40, 20]);
          if (restTimerRef.current) clearInterval(restTimerRef.current);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (restTimerRef.current) clearInterval(restTimerRef.current); };
  }, [restSeconds > 0 ? restBaseRef.current : -1]);

  const fetchLatestWorkout = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'treinos'),
        where('studentId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const latestDoc = querySnapshot.docs[0];
        const data = latestDoc.data() as Workout;
        setWorkout({ id: latestDoc.id, ...data } as Workout);

        const divisions: WorkoutDivision[] = ['A', 'B', 'C', 'D', 'E'];
        const firstActive = divisions.find(d => data.divisions && data.divisions[d] && (data.divisions[d]?.length || 0) > 0);
        if (firstActive) setActiveTab(firstActive);
      }
    } catch (err) {
      console.error('Erro ao buscar treino:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentExercises = workout?.divisions?.[activeTab] || [];

  // Progresso em SÉRIES, não em exercícios — reflete melhor o esforço real.
  const { totalSeries, doneSeries, pct } = useMemo(() => {
    let total = 0, done = 0;
    currentExercises.forEach((ex) => {
      const s = parseInt0(ex.sets) || 1;
      total += s;
      done += Math.min(ex.completedSets || 0, s);
    });
    return { totalSeries: total, doneSeries: done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [currentExercises]);

  const volumeTotal = useMemo(() => {
    // soma de carga_real * reps * séries feitas, em kg — vira "toneladas movidas" na recompensa
    let vol = 0;
    const allDivisions: (Exercise[] | undefined)[] = Object.values(workout?.divisions || ({} as Workout['divisions']));
    allDivisions.forEach((exs) => {
      (exs || []).forEach((ex) => {
        const reps = parseInt0(ex.reps);
        const carga = ex.actualLoad ?? parseFloatLoose(ex.load);
        vol += (ex.completedSets || 0) * reps * carga;
      });
    });
    return Math.round(vol);
  }, [workout]);

  const persistDivisions = async (newDivisions: Workout['divisions']) => {
    if (!workout?.id) return;
    try {
      await updateDoc(doc(db, 'treinos', workout.id), { divisions: newDivisions });
    } catch (err) {
      console.error(err);
      toast('Não deu pra salvar essa marcação. Verifique sua conexão.', 'error');
    }
  };

  const updateExercise = (exerciseId: string, patch: Partial<Exercise>) => {
    if (!workout || !workout.divisions) return;
    const divisionExercises = workout.divisions[activeTab];
    if (!divisionExercises) return;

    const newDivisionExercises = divisionExercises.map(ex =>
      ex.id === exerciseId ? { ...ex, ...patch } : ex
    );
    const newWorkout = { ...workout, divisions: { ...workout.divisions, [activeTab]: newDivisionExercises } };
    setWorkout(newWorkout);
    return newWorkout.divisions;
  };

  // Toque num chip "S1", "S2"... — marca aquela série específica como feita.
  // Se a série tocada já está no ponto (ex.: S2 tocado quando completedSets=2),
  // desmarca; senão avança até ali. Assim o toque sempre reflete o chip clicado.
  const toggleSetChip = (ex: Exercise, chipIndex: number) => {
    const totalSets = parseInt0(ex.sets) || 1;
    const current = Math.min(ex.completedSets || 0, totalSets);
    const targetCount = chipIndex < current ? chipIndex : chipIndex + 1;
    const wasComplete = current === totalSets;

    buzz(chipIndex < current ? 6 : 15);

    const newDivisions = updateExercise(ex.id, { completedSets: targetCount });
    if (newDivisions) persistDivisions(newDivisions);

    // Só dispara descanso quando está AVANÇANDO (marcando) e ainda não é a última série
    if (chipIndex >= current && targetCount < totalSets) {
      const rest = parseRestSeconds(ex.rest);
      if (rest > 0) { restBaseRef.current += 1; setRestSeconds(rest); }
    }

    const nowComplete = targetCount === totalSets;
    if (nowComplete && !wasComplete) {
      handleCheckin();
    }
  };

  const changeActualLoad = (ex: Exercise, delta: number) => {
    const base = ex.actualLoad ?? parseFloatLoose(ex.load);
    const next = Math.max(0, Math.round((base + delta) * 2) / 2); // passos de 0.5
    buzz(6);
    const newDivisions = updateExercise(ex.id, { actualLoad: next });
    if (newDivisions) persistDivisions(newDivisions);
  };

  const handleCheckin = async () => {
    if (!user || !profile) return;
    const today = new Date().toISOString().split('T')[0];
    if (profile.lastCheckin === today) return;

    try {
      const checkinId = `${user.uid}_${today}`;
      await setDoc(doc(db, 'checkins', checkinId), {
        studentId: user.uid,
        date: new Date().toISOString(),
        studentName: profile.name
      });

      await updateProfile({
        lastCheckin: today,
        checkinsTotal: (profile.checkinsTotal || 0) + 1
      });

      toast('Check-in do dia registrado. Bora finalizar o treino!', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleFinishWorkout = async (effort: number) => {
    if (!workout || !user || !profile || isFinishing) return;

    const today = new Date().toISOString().split('T')[0];

    if (profile.ultimoTreinoData === today) {
      setShowEffortModal(false);
      toast('Treino de hoje já está no bolso! Volte amanhã pra manter a sequência. 💪', 'info');
      return;
    }

    setIsFinishing(true);
    setShowEffortModal(false);
    setRestSeconds(0);
    try {
      const newTreinosConcluidos = (profile.treinosConcluidos || 0) + 1;

      await updateDoc(doc(db, 'users', user.uid), {
        treinosConcluidos: newTreinosConcluidos,
        lastWorkoutFinish: new Date().toISOString(),
        ultimoTreinoData: today,
        streak: (profile.streak || 0) + 1
      });

      if (workout.teacherId) {
        await addDoc(collection(db, 'activities'), {
          type: 'workout_finish',
          studentId: user.uid,
          studentName: profile.name,
          teacherId: workout.teacherId,
          timestamp: serverTimestamp(),
          effort,
          volume: volumeTotal,
          message: `${profile.name} concluiu o treino "${workout.divisionNames?.[activeTab] || activeTab}" (Esforço: ${effort}/10, ${volumeTotal}kg movidos)`
        });
      }

      buzz([40, 60, 40]);
      fireConfetti();
      setShowSuccess(true);

      updateProfile({
        ...profile,
        treinosConcluidos: newTreinosConcluidos,
        lastWorkoutFinish: new Date().toISOString(),
        ultimoTreinoData: today,
        streak: (profile.streak || 0) + 1
      });
    } catch (err) {
      console.error(err);
      toast('Erro ao finalizar treino. Verifique sua conexão e tente de novo.', 'error');
    } finally {
      setIsFinishing(false);
    }
  };

  if (loading) return <WorkoutSkeleton />;

  const trainedToday = profile?.ultimoTreinoData === new Date().toISOString().split('T')[0];

  return (
    <div className="p-6 pt-12 max-w-2xl mx-auto">
      <header className="flex justify-between items-start gap-3 mb-8">
        <div className="min-w-0 flex-1">
          <div className="text-[#FFD700] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Meu Treino do Dia</div>
          <h1 className="text-2xl sm:text-3xl font-display uppercase text-white leading-tight line-clamp-2">
            {workout?.title || 'Multy Forças'}
          </h1>
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider flex items-center gap-2 mt-1.5 truncate">
            <UserCheck size={12} className="text-[#FFD700] shrink-0" />
            <span className="truncate">Prof: {workout?.teacherName || 'Equipe Multy'}</span>
          </p>
        </div>
        <motion.div
          whileTap={{ scale: 0.92 }}
          className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3.5 py-2 rounded-2xl shadow-xl shrink-0"
          title={trainedToday ? 'Sequência ativa hoje!' : 'Treine hoje para manter a sequência'}
        >
          <Flame size={20} className={trainedToday ? 'text-[#FFD700]' : 'text-zinc-700'} fill={trainedToday ? 'currentColor' : 'none'} />
          <span className="text-[#FFD700] font-display text-lg">{profile?.streak || 0}</span>
        </motion.div>
      </header>

      {workout && workout.divisions ? (
        <div className="space-y-6 mb-32">
          {/* Abas de divisão */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {(['A', 'B', 'C', 'D', 'E'] as WorkoutDivision[]).map((tab) => {
              const hasExercises = (workout.divisions![tab]?.length || 0) > 0;
              if (!hasExercises) return null;

              return (
                <motion.button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    'px-6 py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-[9px] transition-colors shrink-0 border',
                    activeTab === tab
                      ? 'bg-[#FFD700] text-black shadow-lg shadow-[#FFD700]/10 border-[#FFD700]'
                      : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                  )}
                >
                  {workout.divisionNames?.[tab] || `TREINO ${tab}`}
                </motion.button>
              );
            })}
          </div>

          {/* Barra de progresso — agora medida em SÉRIES, não só exercícios */}
          <div>
            <div className="flex justify-between items-end mb-2 px-1">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Progresso · {workout.divisionNames?.[activeTab] || `Treino ${activeTab}`}
              </span>
              <span className="font-display text-[#FFD700] text-xl leading-none">
                {doneSeries}<span className="text-zinc-600 text-sm mx-0.5">/</span>{totalSeries}
                <span className="text-zinc-600 text-[10px] font-sans font-bold ml-1 uppercase">séries</span>
              </span>
            </div>
            <div className="h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/60">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#E5C100] to-[#FFD700]"
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                style={{ boxShadow: pct > 0 ? '0 0 14px rgba(255,215,0,0.5)' : 'none' }}
              />
            </div>
            <AnimatePresence>
              {pct === 100 && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-black uppercase tracking-widest text-[#FFD700] mt-2 px-1"
                >
                  Tudo marcado — agora é só finalizar!
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Lista de exercícios — chips de série + stepper de carga real */}
          <div className="space-y-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {currentExercises.map((ex, index) => {
                const totalSets = parseInt0(ex.sets) || 1;
                const done = Math.min(ex.completedSets || 0, totalSets);
                const complete = done === totalSets;
                const displayLoad = ex.actualLoad ?? parseFloatLoose(ex.load);

                return (
                  <motion.div
                    key={`${activeTab}-${ex.id}`}
                    layout
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: index * 0.04, type: 'spring', stiffness: 260, damping: 24 }}
                    className={cn(
                      'w-full p-6 rounded-[2rem] border transition-colors relative overflow-hidden',
                      complete ? 'bg-[#FFD700]/5 border-[#FFD700]/20' : 'bg-zinc-900/40 border-zinc-800/50 shadow-premium'
                    )}
                  >
                    {complete && <div className="absolute left-0 top-0 w-1 h-full bg-[#FFD700]" />}

                    <div className="flex items-start justify-between gap-3">
                      <button onClick={() => setSheetExercise(ex)} className="flex-1 text-left group">
                        <div className={cn('font-black text-lg tracking-tight uppercase italic leading-tight', complete ? 'text-zinc-600 line-through decoration-[#FFD700]/40 decoration-2' : 'text-white')}>
                          {ex.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-zinc-500 font-bold uppercase text-[9px] tracking-wider">
                          <span>{ex.sets}×{ex.reps}</span>
                          {ex.rest && <span className="flex items-center gap-1"><Clock size={10} />{ex.rest}</span>}
                          <Info size={11} className="text-zinc-700 group-hover:text-[#FFD700] transition-colors" />
                        </div>
                      </button>

                      {/* Stepper de carga real do dia */}
                      <div className="flex items-center gap-0.5 border border-zinc-800 rounded-full px-1 py-1 bg-black/40 shrink-0">
                        <button onClick={() => changeActualLoad(ex, -2.5)} className="w-7 h-7 flex items-center justify-center text-zinc-500 active:text-white transition-colors">
                          <Minus size={13} />
                        </button>
                        <div className="text-center min-w-[42px]">
                          <div className="font-display text-white text-[15px] leading-none">{displayLoad || 0}</div>
                          <div className="text-zinc-600 font-bold text-[7px] tracking-wider">KG</div>
                        </div>
                        <button onClick={() => changeActualLoad(ex, 2.5)} className="w-7 h-7 flex items-center justify-center text-zinc-500 active:text-white transition-colors">
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Chips de série — o toque tátil principal */}
                    <div className="flex gap-2 mt-4">
                      {Array.from({ length: totalSets }).map((_, si) => {
                        const chipDone = si < done;
                        return (
                          <motion.button
                            key={si}
                            onClick={() => toggleSetChip(ex, si)}
                            whileTap={{ scale: 0.9 }}
                            animate={chipDone ? { y: [0, -2, 0] } : { y: 0 }}
                            transition={{ duration: 0.25 }}
                            className={cn(
                              'flex-1 py-3 rounded-xl font-display text-[13px] transition-colors border',
                              chipDone
                                ? 'bg-[#FFD700] text-black border-[#FFD700] shadow-lg shadow-[#FFD700]/25'
                                : 'bg-black/40 text-zinc-600 border-zinc-800'
                            )}
                          >
                            S{si + 1}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <motion.button
            onClick={() => setShowEffortModal(true)}
            disabled={isFinishing}
            whileTap={{ scale: 0.96 }}
            className={cn(
              'w-full py-6 rounded-[2.5rem] bg-[#FFD700] text-black font-display uppercase tracking-[0.2em] text-base flex items-center justify-center gap-3 shadow-xl shadow-[#FFD700]/10 transition-colors hover:bg-yellow-400 disabled:opacity-50 mt-10 mb-20',
              isFinishing && 'animate-pulse'
            )}
          >
            <Zap size={20} fill="currentColor" />
            {isFinishing ? 'Registrando...' : 'Finalizar Treino'}
          </motion.button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 text-center px-10 min-h-[60vh]">
          <div className="w-24 h-24 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center border border-zinc-800 mb-6 shadow-2xl">
            <ClipboardList size={40} className="text-[#FFD700] opacity-50" />
          </div>
          <h3 className="text-2xl font-display uppercase text-white mb-3">Nenhum treino montado</h3>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider max-w-[250px] leading-relaxed">Fale com seu instrutor para que seu treino apareça aqui no app.</p>
        </div>
      )}

      {/* Timer de descanso flutuante */}
      <AnimatePresence>
        {restSeconds > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 10, x: '-50%' }}
            className="fixed left-1/2 bottom-24 z-[60] flex items-center gap-3 px-5 py-3 rounded-full border border-[#FFD700]/35 bg-zinc-900/95 backdrop-blur-xl shadow-2xl"
          >
            <Timer size={16} className="text-[#FFD700]" />
            <span className="text-zinc-400 font-bold uppercase text-[9px] tracking-widest">Descanso</span>
            <span className="font-display text-[#FFD700] text-xl min-w-[42px] text-center">
              {Math.floor(restSeconds / 60)}:{String(restSeconds % 60).padStart(2, '0')}
            </span>
            <button onClick={() => setRestSeconds(0)} className="text-zinc-500 hover:text-white transition-colors">
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom sheet de detalhes do exercício */}
      <AnimatePresence>
        {sheetExercise && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSheetExercise(null)}
              className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="fixed inset-x-0 bottom-0 z-[91] max-w-2xl mx-auto bg-zinc-900 border-t border-[#FFD700]/20 rounded-t-[2rem] p-6 pb-10"
            >
              <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto mb-5" />
              <div className="text-[#FFD700] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Detalhes do exercício</div>
              <h3 className="text-2xl font-display uppercase text-white mb-4 leading-tight">{sheetExercise.name}</h3>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="border border-zinc-800 bg-black/40 rounded-2xl p-3 text-center">
                  <div className="font-display text-white text-base">{sheetExercise.sets}×{sheetExercise.reps}</div>
                  <div className="text-zinc-600 font-bold uppercase text-[7px] tracking-widest mt-1">Séries × Reps</div>
                </div>
                <div className="border border-zinc-800 bg-black/40 rounded-2xl p-3 text-center">
                  <div className="font-display text-white text-base">{sheetExercise.load || '—'}</div>
                  <div className="text-zinc-600 font-bold uppercase text-[7px] tracking-widest mt-1">Carga prescrita</div>
                </div>
                <div className="border border-zinc-800 bg-black/40 rounded-2xl p-3 text-center">
                  <div className="font-display text-white text-base">{sheetExercise.rest || '—'}</div>
                  <div className="text-zinc-600 font-bold uppercase text-[7px] tracking-widest mt-1">Descanso</div>
                </div>
              </div>

              {sheetExercise.observation && (
                <div className="border border-zinc-800 bg-black/30 rounded-2xl p-4 mb-5">
                  <div className="text-[#FFD700] text-[9px] font-black uppercase tracking-[0.2em] mb-1">Observação do professor</div>
                  <p className="text-zinc-300 italic text-[13px] leading-relaxed">"{sheetExercise.observation}"</p>
                </div>
              )}

              <button
                onClick={() => setSheetExercise(null)}
                className="w-full py-4 bg-[#FFD700] text-black rounded-2xl font-display uppercase tracking-widest text-sm hover:bg-yellow-400 transition-colors"
              >
                Voltar ao treino
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal de esforço */}
      <AnimatePresence>
        {showEffortModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] w-full max-w-sm text-center space-y-6 shadow-2xl"
            >
              <div className="text-[#FFD700] text-[10px] font-black uppercase tracking-[0.2em]">Feedback de Treino</div>
              <h3 className="text-2xl font-display uppercase text-white leading-tight">Como foi o esforço de hoje?</h3>

              <div className="py-6">
                <motion.div
                  key={effortScore}
                  initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  className="text-6xl font-display text-[#FFD700] mb-4"
                >
                  {effortScore}
                </motion.div>
                <input
                  type="range" min="1" max="10" step="1" value={effortScore}
                  onChange={(e) => { setEffortScore(parseInt(e.target.value)); buzz(6); }}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#FFD700]"
                  aria-label="Nível de esforço de 1 a 10"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase mt-2 px-1">
                  <span>Tranquilo</span><span>Extremo</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleFinishWorkout(effortScore)}
                  className="w-full py-5 bg-[#FFD700] text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-yellow-400 transition-colors"
                >
                  Confirmar e Finalizar
                </motion.button>
                <button
                  onClick={() => setShowEffortModal(false)}
                  className="w-full py-4 bg-zinc-800 text-zinc-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:text-white transition-colors"
                >
                  Voltar ao treino
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay de celebração — agora com volume total movido, como no protótipo */}
      <AnimatePresence>
        {showSuccess && workout && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-lg p-6"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
              className="bg-zinc-900 border border-[#FFD700]/30 p-10 rounded-[3rem] text-center space-y-6 shadow-2xl relative overflow-hidden max-w-sm w-full"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent" />

              <motion.div
                initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.15 }}
                className="w-24 h-24 bg-[#FFD700] rounded-full mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(255,215,0,0.4)]"
              >
                <Trophy size={48} className="text-black" />
              </motion.div>

              <div>
                <h2 className="text-4xl font-display uppercase text-[#FFD700] mb-2 leading-tight">Treino no Bolso!</h2>
                <p className="text-white text-xs font-bold uppercase tracking-[0.2em]">{workout.divisionNames?.[activeTab] || activeTab} finalizado</p>
              </div>

              <div className="pt-4 border-t border-zinc-800/50">
                <div className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] mb-4">Sua ficha de atleta</div>
                <div className="flex justify-center gap-7">
                  <div className="text-center">
                    <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 15 }} className="text-2xl font-display text-[#FFD700]">
                      {profile?.treinosConcluidos || 0}
                    </motion.div>
                    <div className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Treinos</div>
                  </div>
                  <div className="text-center">
                    <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 15 }} className="flex items-center gap-1 text-2xl font-display text-white justify-center">
                      <Flame size={20} fill="#FFD700" className="text-[#FFD700]" />
                      {(profile?.streak || 0)}
                    </motion.div>
                    <div className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Sequência</div>
                  </div>
                  <div className="text-center">
                    <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 15 }} className="flex items-center gap-1 text-2xl font-display text-white justify-center">
                      <Weight size={18} className="text-[#FFD700]" />
                      {(volumeTotal / 1000).toFixed(1)}t
                    </motion.div>
                    <div className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Volume movido</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800/50">
                <p className="text-[10px] text-[#FFD700] italic font-black uppercase tracking-widest mb-2">Esforço: {effortScore}/10</p>
                <p className="text-[11px] text-zinc-500 italic leading-relaxed">"{fraseDoDia}"</p>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowSuccess(false)}
                className="w-full py-4 bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-700 transition-colors"
              >
                Voltar ao painel
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
