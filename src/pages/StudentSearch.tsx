import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, Workout, Exercise, WorkoutDivision } from '../types';
import { Search, User, ClipboardList, Plus, Trash2, Save, X, Weight, Clock, UserCheck, Download, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export const StudentSearch: React.FC = () => {
  const { user: currentUserData, profile: currentProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [activeDivision, setActiveDivision] = useState<WorkoutDivision>('A');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSearch, setImportSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAllStudents();
  }, []);

  useEffect(() => {
    if (searchTerm === '') {
      setStudents(allStudents);
    } else {
      const filtered = allStudents.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.cpf.includes(searchTerm)
      );
      setStudents(filtered);
    }
  }, [searchTerm, allStudents]);

  const fetchAllStudents = async () => {
    setLoading(true);
    try {
      // Fetch all 'aluno'
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'aluno')
      );
      const querySnapshot = await getDocs(q);
      let data = querySnapshot.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile));
      
      // If the current user is NOT an aluno, they might not be in the list.
      // But they need to be able to edit their own workout.
      // Check if current user is already in data
      const isAlreadyInList = data.some(s => s.uid === currentUserData?.uid);
      
      if (!isAlreadyInList && currentProfile) {
        // Add the current staff member to the list so they can select themselves
        data = [{ ...currentProfile }, ...data];
      }

      // Sort alphabetically
      data.sort((a, b) => a.name.localeCompare(b.name));

      setAllStudents(data);
      setStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectStudent = async (student: UserProfile) => {
    setSelectedStudent(student);
    setLoading(true);
    try {
      const q = query(
        collection(db, 'treinos'),
        where('studentId', '==', student.uid),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const latestDoc = querySnapshot.docs[0];
        const data = latestDoc.data();
        setWorkout({
          id: latestDoc.id,
          ...data,
          studentId: data.studentId || student.uid,
          studentName: data.studentName || student.name,
          teacherId: data.teacherId || '',
          teacherName: data.teacherName || '',
          title: data.title || 'Treino',
          divisions: data.divisions || { A: [], B: [], C: [], D: [], E: [] },
          divisionNames: data.divisionNames || { A: 'TREINO A', B: 'TREINO B', C: 'TREINO C', D: 'TREINO D', E: 'TREINO E' },
          createdAt: data.createdAt || new Date().toISOString()
        } as Workout);
      } else {
        setWorkout({
          studentId: student.uid,
          studentName: student.name,
          teacherId: '',
          teacherName: '',
          title: 'Novo Treino',
          divisions: { A: [], B: [], C: [], D: [], E: [] },
          divisionNames: { A: 'TREINO A', B: 'TREINO B', C: 'TREINO C', D: 'TREINO D', E: 'TREINO E' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportWorkout = async (sourceUserId: string) => {
    if (!sourceUserId) {
      alert('Selecione um perfil para importar.');
      return;
    }

    try {
      setLoading(true);
      const q = query(collection(db, 'treinos'), where('studentId', '==', sourceUserId), orderBy('createdAt', 'desc'), limit(1));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        alert('Nenhum treino encontrado para o perfil selecionado.');
        return;
      }

      const data = snap.docs[0].data();
      
      if (workout) {
        setWorkout({
          ...workout,
          divisions: JSON.parse(JSON.stringify(data.divisions || { A: [], B: [], C: [], D: [], E: [] })),
          divisionNames: JSON.parse(JSON.stringify(data.divisionNames || { A: 'TREINO A', B: 'TREINO B', C: 'TREINO C', D: 'TREINO D', E: 'TREINO E' })),
          title: (data.title || 'Protocolo de Treinamento'),
          updatedAt: new Date().toISOString()
        });
      }
      
      setShowImportModal(false);
      setImportSearch('');
      alert('Treino importado com sucesso');
    } catch (err) {
      console.error('Erro ao importar:', err);
      alert('Erro ao carregar o treino selecionado.');
    } finally {
      setLoading(false);
    }
  };

  const addExercise = () => {
    if (!workout) return;
    const currentExercises = workout.divisions[activeDivision] || [];
    const newExercise: Exercise = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      sets: '3',
      reps: '12',
      load: '',
      rest: '',
      order: currentExercises.length,
      observation: ''
    };
    setWorkout({
      ...workout,
      divisions: {
        ...workout.divisions,
        [activeDivision]: [...currentExercises, newExercise]
      }
    });
  };

  const updateExercise = (id: string, data: Partial<Exercise>) => {
    if (!workout) return;
    const currentExercises = workout.divisions[activeDivision] || [];
    setWorkout({
      ...workout,
      divisions: {
        ...workout.divisions,
        [activeDivision]: currentExercises.map(ex => ex.id === id ? { ...ex, ...data } : ex)
      }
    });
  };

  const removeExercise = (id: string) => {
    if (!workout) return;
    const currentExercises = workout.divisions[activeDivision] || [];
    setWorkout({
      ...workout,
      divisions: {
        ...workout.divisions,
        [activeDivision]: currentExercises.filter(ex => ex.id !== id)
      }
    });
  };

  const saveWorkout = async () => {
    if (!workout || !selectedStudent) return;
    setSaving(true);
    try {
      const workoutData = {
        ...workout,
        updatedAt: new Date().toISOString()
      };
      
      if (workout.id) {
        await updateDoc(doc(db, 'treinos', workout.id), {
          ...workoutData,
          teacherId: currentUserData?.uid,
          teacherName: currentProfile?.name
        });
      } else {
        await setDoc(doc(collection(db, 'treinos')), {
          ...workoutData,
          teacherId: currentUserData?.uid,
          teacherName: currentProfile?.name
        });
      }
      alert('Prescrição de treino atualizada!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar treino.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 pt-12 max-w-4xl mx-auto">
      {!selectedStudent ? (
        <>
          <header className="mb-10">
            <div className="text-[#FFD700] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Multy Forças Database</div>
            <h1 className="text-3xl font-black italic uppercase text-white leading-tight">Prescrição</h1>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Selecione um atleta para editar</p>
          </header>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" size={20} strokeWidth={2.5} />
              <input
                type="text"
                placeholder="Nome ou CPF do atleta..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-[1.5rem] pl-14 pr-6 py-5 text-white focus:border-[#FFD700] outline-none transition-all shadow-premium"
              />
            </div>
            {currentProfile && (
              <button
                onClick={() => selectStudent(currentProfile)}
                className="bg-zinc-900/60 border border-zinc-800 hover:border-[#FFD700]/50 rounded-[1.5rem] px-6 py-4 flex items-center justify-center gap-3 transition-all group overflow-hidden relative shadow-premium grow-0"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <UserCheck size={20} className="text-[#FFD700]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap">Montar Meu Treino</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-20 text-zinc-700 animate-pulse font-black uppercase tracking-[0.2em]">Varrendo banco de dados...</div>
            ) : students.length > 0 ? (
              students.map(student => {
                const isMe = student.uid === currentUserData?.uid;
                return (
                  <button
                    key={student.uid}
                    onClick={() => selectStudent(student)}
                    className={cn(
                      "w-full p-5 rounded-[2rem] flex items-center gap-5 border transition-all group relative overflow-hidden",
                      isMe 
                        ? "bg-[#FFD700]/5 border-[#FFD700]/20 hover:bg-[#FFD700]/10 hover:border-[#FFD700]/40" 
                        : "bg-zinc-900/30 border-zinc-900 hover:border-[#FFD700]/30 hover:bg-zinc-900/50"
                    )}
                  >
                    <div className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center transition-colors shadow-lg border",
                      isMe ? "bg-black text-[#FFD700] border-[#FFD700]/30" : "bg-black text-zinc-700 group-hover:text-[#FFD700] border-zinc-900"
                    )}>
                      <User size={28} />
                    </div>
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "font-black italic uppercase transition-colors",
                          isMe ? "text-[#FFD700]" : "text-white group-hover:text-[#FFD700]"
                        )}>
                          {student.name}
                        </div>
                        {isMe && (
                          <span className="bg-[#FFD700] text-black text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">VOCÊ</span>
                        )}
                        {student.role !== 'aluno' && !isMe && (
                          <span className="bg-zinc-800 text-zinc-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter border border-zinc-700">{student.role}</span>
                        )}
                      </div>
                      <div className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600 mt-1">
                        {student.cpf ? `CPF: ${student.cpf}` : `ID: ${student.uid.substring(0, 8)}...`}
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <ClipboardList size={18} className="text-[#FFD700]" />
                    </div>
                  </button>
                );
              })
            ) : searchTerm !== '' ? (
              <div className="text-center py-20 text-zinc-700 font-bold uppercase tracking-widest italic border-2 border-dashed border-zinc-900 rounded-3xl">Nenhum atleta localizado.</div>
            ) : (
              <div className="text-center py-20 text-zinc-800 uppercase tracking-widest font-black text-xs opacity-50 italic">Nenhum atleta cadastrado no sistema.</div>
            )}
          </div>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedStudent(null)}
                className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
              
              <div className="flex gap-2">
                {currentProfile?.role !== 'aluno' && (
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="bg-zinc-800 text-zinc-400 hover:text-[#FFD700] px-4 py-2 rounded-xl border border-zinc-700 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                  >
                    <Download size={14} /> Importar Treino Base
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={saveWorkout}
              disabled={saving}
              className="bg-[#FFD700] text-black font-black uppercase tracking-widest py-3 px-8 rounded-2xl flex items-center gap-3 shadow-xl shadow-[#FFD700]/10 hover:bg-yellow-400 transition-all text-xs"
            >
              {saving ? 'PROCESSANDO...' : 'SALVAR TREINO'} <Save size={18} strokeWidth={2.5} />
            </button>
          </div>

          <div className="mb-10 text-center sm:text-left space-y-4">
            <div>
              <div className="text-[#FFD700] text-[10px] font-black uppercase tracking-[0.3em] mb-2 leading-none">Athlete Prescription</div>
              <h1 className="text-4xl font-black italic uppercase text-white leading-tight underline decoration-[#FFD700]/20 underline-offset-8">{selectedStudent.name}</h1>
            </div>

            <div className="space-y-4">
              <div className="flex gap-1 p-1 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                {(['A', 'B', 'C', 'D', 'E'] as WorkoutDivision[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveDivision(tab)}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      activeDivision === tab 
                        ? "bg-[#FFD700] text-black shadow-lg" 
                        : "text-zinc-500 hover:text-white"
                    )}
                  >
                    Ficha {tab}
                  </button>
                ))}
              </div>

              <div className="space-y-2 px-1">
                <label className="text-[10px] uppercase font-black text-zinc-600 tracking-widest ml-4">Nome da Ficha {activeDivision}</label>
                <input
                  type="text"
                  placeholder="Ex: Superior e Cardio"
                  value={workout?.divisionNames?.[activeDivision] || ''}
                  onChange={e => setWorkout(prev => prev ? ({
                    ...prev,
                    divisionNames: {
                      ...prev.divisionNames,
                      [activeDivision]: e.target.value.toUpperCase()
                    }
                  }) : null)}
                  className="w-full bg-zinc-900/40 border border-zinc-800/50 rounded-[1.5rem] px-6 py-4 text-white font-black italic uppercase placeholder-zinc-800 outline-none focus:border-[#FFD700]/50 transition-all shadow-premium"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6 mb-32">
            {workout?.divisions?.[activeDivision]?.map((ex, index) => (
              <div key={ex.id} className="bg-zinc-900/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-zinc-800 shadow-premium group">
                <div className="flex justify-between items-center mb-6">
                  <span className="bg-black text-[#FFD700] text-[10px] font-black px-4 py-2 rounded-xl italic border border-zinc-800 uppercase tracking-widest">
                    {workout?.divisionNames?.[activeDivision] || `Ficha ${activeDivision}`} | #{index + 1}
                  </span>
                  <button onClick={() => removeExercise(ex.id)} className="text-red-500/30 hover:text-red-500 transition-colors p-2">
                    <Trash2 size={20} />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-zinc-600 tracking-widest ml-1">Descrição do Exercício</label>
                    <input
                      type="text"
                      placeholder="Ex: Pulley Costas Aberto"
                      value={ex.name}
                      onChange={e => updateExercise(ex.id, { name: e.target.value })}
                      className="w-full bg-black/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white font-black italic uppercase placeholder-zinc-800 outline-none focus:border-[#FFD700]/50 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-zinc-600 tracking-widest uppercase ml-1">Séries</label>
                      <input
                        type="text"
                        value={ex.sets}
                        onChange={e => updateExercise(ex.id, { sets: e.target.value })}
                        className="w-full bg-black/50 border border-zinc-800 rounded-xl p-3 text-center text-white font-bold outline-none focus:border-[#FFD700]/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-zinc-600 tracking-widest uppercase ml-1">Reps</label>
                      <input
                        type="text"
                        value={ex.reps}
                        onChange={e => updateExercise(ex.id, { reps: e.target.value })}
                        className="w-full bg-black/50 border border-zinc-800 rounded-xl p-3 text-center text-white font-bold outline-none focus:border-[#FFD700]/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-zinc-600 tracking-widest uppercase ml-1">Carga</label>
                      <input
                        type="text"
                        value={ex.load || ''}
                        onChange={e => updateExercise(ex.id, { load: e.target.value })}
                        className="w-full bg-black/50 border border-zinc-800 rounded-xl p-3 text-center text-white font-bold outline-none focus:border-[#FFD700]/30"
                        placeholder="Ex: 20kg"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-zinc-600 tracking-widest uppercase ml-1">Descanso</label>
                      <input
                        type="text"
                        value={ex.rest || ''}
                        onChange={e => updateExercise(ex.id, { rest: e.target.value })}
                        className="w-full bg-black/50 border border-zinc-800 rounded-xl p-3 text-center text-white font-bold outline-none focus:border-[#FFD700]/30"
                        placeholder="Ex: 60s"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-600 tracking-widest uppercase ml-1">Observações Técnicas</label>
                    <textarea
                      value={ex.observation || ''}
                      onChange={e => updateExercise(ex.id, { observation: e.target.value })}
                      className="w-full bg-black/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white font-black italic placeholder-zinc-800 outline-none focus:border-[#FFD700]/50 transition-all h-24 resize-none"
                    />
                  </div>
                </div>
              </div>
            ))}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={addExercise}
              className="w-full bg-black border-2 border-dashed border-zinc-800 rounded-[2.5rem] p-10 flex flex-col items-center justify-center gap-4 text-zinc-700 hover:border-[#FFD700]/30 hover:text-[#FFD700] transition-all group"
            >
              <div className="p-4 bg-zinc-900 rounded-2xl group-hover:bg-[#FFD700]/10 transition-colors">
                <Plus size={40} strokeWidth={2.5} />
              </div>
              <span className="font-black italic uppercase tracking-[0.2em] text-sm">Adicionar Movimento</span>
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Import Workout Modal */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-[3rem] p-8 shadow-2xl relative flex flex-col max-h-[80vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-black italic uppercase text-white leading-none">Importar Treino</h3>
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">Selecione um perfil de origem</p>
                </div>
                <button onClick={() => setShowImportModal(false)} className="text-zinc-600 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="relative mb-6">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome..."
                  value={importSearch}
                  onChange={e => setImportSearch(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:border-[#FFD700] outline-none transition-all placeholder-zinc-800"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                {allStudents
                  .filter(u => u.name.toLowerCase().includes(importSearch.toLowerCase()))
                  .sort((a,b) => a.name.localeCompare(b.name))
                  .map(source => (
                  <button
                    key={source.id || source.uid}
                    onClick={() => handleImportWorkout(source.id || source.uid || '')}
                    className="w-full p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl flex items-center justify-between group hover:border-[#FFD700]/30 transition-all text-left"
                  >
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-[#FFD700] transition-colors">{source.name}</div>
                      <div className={cn(
                        "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded mt-1 inline-block",
                        source.role === 'aluno' ? "bg-zinc-800 text-zinc-400" : "bg-[#FFD700] text-black"
                      )}>
                        {source.role}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-800 group-hover:text-[#FFD700] transition-all" />
                  </button>
                ))}
                
                {allStudents.filter(u => u.name.toLowerCase().includes(importSearch.toLowerCase())).length === 0 && (
                  <div className="py-10 text-center text-zinc-700 font-black uppercase text-[10px] tracking-widest">
                    Nenhum resultado
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
