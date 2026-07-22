import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, doc, setDoc, orderBy, updateDoc, limit, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '../lib/firebase';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { UserProfile, UserRole, OperationType } from '../types';
import { UserPlus, Users, BarChart3, ChevronRight, User, Flame, Pencil, ShieldAlert, ShieldCheck, Dumbbell, Plus, Trash2, X, Zap, Clock, Download, Search, Calendar, Upload, Apple, ClipboardList, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from '../components/Logo';
import { cn } from '../lib/utils';
import { handleFirestoreError } from '../lib/firestore-errors';
import { Exercise, WorkoutDivision, Workout } from '../types';

interface AdminDashboardProps {
  initialTab?: 'membros' | 'treinos' | 'agenda';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ initialTab }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [targetStudent, setTargetStudent] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  // Filtered users based on role and search term
  const filteredUsers = React.useMemo(() => {
    let result = [...users];

    // 1. Visibility Filter: Non-admins only see 'aluno' AND themselves
    if (profile?.role !== 'admin') {
      result = result.filter(u => u.role === 'aluno' || u.uid === profile?.uid || u.id === profile?.id);
    }

    // 2. Search Filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase().trim();
      const cleanSearchCpf = searchTerm.replace(/\D/g, '');

      result = result.filter(u => {
        const nameMatch = u.name.toLowerCase().includes(lowerSearch);
        const cpfMatch = cleanSearchCpf ? u.cpf.replace(/\D/g, '').includes(cleanSearchCpf) : false;
        return nameMatch || cpfMatch;
      });
    }

    // 3. Alphabetical Sorting
    return result.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [users, profile, searchTerm]);

  // Workout Construction State
  const [activeDivision, setActiveDivision] = useState<WorkoutDivision>('A');
  const [workoutDivisions, setWorkoutDivisions] = useState<Record<WorkoutDivision, Exercise[]>>({
    A: [], B: [], C: [], D: [], E: []
  });
  const [divisionNames, setDivisionNames] = useState<Record<WorkoutDivision, string>>({
    A: 'TREINO A', B: 'TREINO B', C: 'TREINO C', D: 'TREINO D', E: 'TREINO E'
  });
  const [workoutTitle, setWorkoutTitle] = useState('Protocolo de Treinamento');
  const [currentEx, setCurrentEx] = useState({ name: '', sets: '', reps: '', load: '', rest: '', observation: '' });
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSearch, setImportSearch] = useState('');
  
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [importingCsv, setImportingCsv] = useState(false);
  const [selectedStudentForApp, setSelectedStudentForApp] = useState<UserProfile | null>(null);
  const [appointmentForm, setAppointmentForm] = useState({
    services: [] as string[],
    observation: '',
    paymentStatus: 'Pendente' as 'Pago' | 'Pendente'
  });
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const isAdmin = profile?.role === 'admin';
  const isProfessor = profile?.role === 'professor';
  const isColaborador = profile?.role === 'colaborador';
  const isAdminOrProfessor = isAdmin || isProfessor;
  const isColaboradorOrAdmin = isColaborador || isAdmin;

  const [activeMainTab, setActiveMainTab] = useState<'membros' | 'treinos' | 'agenda'>(
    initialTab || (isProfessor ? 'treinos' : (isColaborador ? 'agenda' : 'membros'))
  );
  const [activeAgendaTab, setActiveAgendaTab] = useState<'ativos' | 'historico'>('ativos');
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [selectedHistoryStudent, setSelectedHistoryStudent] = useState<UserProfile | null>(null);
  const [historyResults, setHistoryResults] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState<any | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveMainTab(initialTab);
    }
  }, [initialTab]);
  const [allAppointments, setAllAppointments] = useState<any[]>([]);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const q = query(collection(db, 'agendamentos'), orderBy('date', 'asc'));
        const snap = await getDocs(q);
        setAllAppointments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'agendamentos');
      }
    };
    fetchAppointments();
  }, []);

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

  // Security check: Redirect/Block students
  if (profile?.role === 'aluno') {
    return (
      <div className="p-20 text-center text-zinc-500 font-bold uppercase tracking-[0.2em]">
        Acesso restrito. Redirecionando...
      </div>
    );
  }
  
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    role: 'aluno' as UserRole
  });

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingCsv(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setImportingCsv(false);
        return;
      }

      // Handle both CRLF and LF lines, and filter out empty lines
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      
      if (lines.length <= 1) {
        alert("O arquivo CSV parece estar vazio ou contém apenas o cabeçalho.");
        setImportingCsv(false);
        return;
      }

      // Detect separator (comma or semicolon)
      const header = lines[0];
      const separator = header.includes(';') ? ';' : ',';
      
      const studentsToImport = lines.slice(1);
      let successCount = 0;
      let errorCount = 0;

      for (const line of studentsToImport) {
        const columns = line.split(separator).map(col => col.trim());
        if (columns.length < 2) continue; // Skip malformed lines

        const [nome, email, telefone] = columns;

        try {
          // Creating a unique ID based on a hash of the email or just let Firestore handle it
          // Requirement says addDoc or setDoc with unique ID
          await addDoc(collection(db, 'users'), {
            name: nome,
            email: email || '',
            phone: telefone || '',
            role: 'aluno',
            treinosConcluidos: 0,
            ultimoTreinoData: null,
            status: 'ativo',
            ativo: true,
            createdAt: serverTimestamp()
          });
          successCount++;
        } catch (err) {
          console.error(`Erro ao importar aluno ${nome}:`, err);
          errorCount++;
        }
      }

      setImportingCsv(false);
      // Reset input
      e.target.value = '';
      
      alert(`Importação concluída!\nSucesso: ${successCount}\nErros: ${errorCount}\nOs alunos foram adicionados à base de dados.`);
      fetchUsers();
    };

    reader.onerror = () => {
      alert("Erro ao ler o arquivo CSV.");
      setImportingCsv(false);
    };

    reader.readAsText(file);
  };

  const handleSaveAppointment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const existingApp = editingAppointmentId ? allAppointments.find(a => a.id === editingAppointmentId) : null;
    const targetId = editingAppointmentId || selectedStudentForApp?.uid || selectedStudentForApp?.id;

    // PASSO 1: SANITIZAÇÃO DE DADOS (CLEANUP)
    if (!profile || !targetId) {
      console.error("Tentativa de agendamento sem aluno selecionado ou perfil de usuário.");
      return;
    }
    
    if (!data || !hora || appointmentForm.services.length === 0) {
      alert('Por favor, selecione ao menos um serviço e a data/horário da consulta.');
      return;
    }

    try {
      setLoading(true);
      const dataFinal = `${data}T${hora}`;
      
      // Regra de Ouro: NENHUM campo pode ser undefined.
      const appointmentData: any = {
        studentId: existingApp?.studentId || selectedStudentForApp?.uid || selectedStudentForApp?.id || null,
        studentName: existingApp?.studentName || selectedStudentForApp?.name || 'Aluno s/ nome',
        services: appointmentForm.services || [],
        date: dataFinal || "",
        observation: appointmentForm.observation || "",
        paymentStatus: appointmentForm.paymentStatus || 'Pendente',
        updatedAt: new Date().toISOString()
      };

      if (editingAppointmentId) {
        await updateDoc(doc(db, 'agendamentos', editingAppointmentId), appointmentData);
        alert('Consulta atualizada com sucesso!');
      } else {
        const newAppointment = {
          ...appointmentData,
          createdBy: profile.uid || profile.id,
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'agendamentos'), newAppointment);
        alert('Consulta agendada com sucesso!');
      }
      
      setShowAppointmentModal(false);
      setEditingAppointmentId(null);
      setSelectedStudentForApp(null);
      setAppointmentSearch('');
      setData('');
      setHora('');
      setAppointmentForm({
        services: [],
        observation: '',
        paymentStatus: 'Pendente'
      });
      
      // Refresh appointment list
      const q = query(collection(db, 'agendamentos'), orderBy('date', 'asc'));
      const snap = await getDocs(q);
      setAllAppointments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err: any) {
      console.error("Erro Crítico ao salvar agendamento:", err);
      handleFirestoreError(err, editingAppointmentId ? OperationType.UPDATE : OperationType.CREATE, 'agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      console.log('Iniciando deleção no Firestore do ID:', id);
      setLoading(true);
      
      // 1. Apaga do banco de dados Firebase
      const docRef = doc(db, 'agendamentos', id);
      await deleteDoc(docRef);
      
      // 2. Atualiza a tela filtrando o estado local
      setAllAppointments(prev => prev.filter(a => a.id !== id));
      
      alert('🔥 Consulta EXCLUÍDA do banco de dados!');
    } catch (err: any) {
      console.error('ERRO AO DELETAR:', err);
      alert('Erro do Firebase: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const startEditAppointment = (app: any) => {
    setEditingAppointmentId(app.id);
    setAppointmentForm({
      services: app.services || [],
      observation: app.observation || '',
      paymentStatus: app.paymentStatus || 'Pendente'
    });
    
    // PASSO 2: CORREÇÃO DA ABERTURA DO MODO DE EDIÇÃO
    // Mocking minimal student profile to satisfy UI requirements in modal
    setSelectedStudentForApp({
      uid: app.studentId,
      name: app.studentName,
      role: 'aluno'
    } as any);

    const [d, h] = app.date.split('T');
    setData(d);
    setHora(h?.substring(0, 5) || '');
    setShowAppointmentModal(true);
  };

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, 'users'), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      const fetchedUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
      setUsers(fetchedUsers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile?.role !== 'admin') {
      alert('Erro: Apenas administradores podem realizar esta ação.');
      return;
    }
    try {
      const cleanCpf = formData.cpf.replace(/\D/g, '');
      if (cleanCpf.length !== 11) {
        alert('CPF inválido. Digite 11 números.');
        return;
      }

      setLoading(true);
      const email = `${cleanCpf}@multyforcas.com.br`;
      
      // Safe secondary app initialization
      let secondaryApp;
      try {
        secondaryApp = getApps().find(app => app.name === 'Secondary') || initializeApp(firebaseConfig, 'Secondary');
      } catch (e) {
        secondaryApp = getApp('Secondary');
      }

      const secondaryAuth = getAuth(secondaryApp);
      
      let uid = '';
      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, cleanCpf);
        uid = userCredential.user.uid;
        await signOut(secondaryAuth);
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          alert('Este CPF já está cadastrado no sistema de autenticação.');
        } else {
          console.error("Erro na autenticação secundária:", authErr);
          alert('Erro ao criar credenciais: ' + authErr.message);
        }
        setLoading(false);
        return;
      }
      
      const newUser: Omit<UserProfile, 'uid'> = {
        name: formData.name,
        cpf: cleanCpf,
        role: formData.role,
        primeiro_acesso: true,
        checkinsTotal: 0,
        streak: 0,
        treinosConcluidos: 0,
        ultimoTreinoData: null,
        status: 'ativo',
        ativo: true
      };

      await setDoc(doc(db, 'users', uid), newUser);
      
      setShowAddModal(false);
      setFormData({ name: '', cpf: '', role: 'aluno' });
      fetchUsers();
      alert(`Usuário ${formData.name} cadastrado com sucesso! Use o CPF como senha no primeiro acesso.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${formData.cpf}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryForStudent = async (student: UserProfile) => {
    setSelectedHistoryStudent(student);
    setLoadingHistory(true);
    try {
      const now = new Date().toISOString();
      const studentId = student.id || student.uid;
      const q = query(
        collection(db, 'agendamentos'),
        where('studentId', '==', studentId),
        where('date', '<', now),
        orderBy('date', 'desc'),
        limit(3) 
      );
      
      const snap = await getDocs(q);
      setHistoryResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Erro ao buscar histórico:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const currentMatchingStudentsForHistory = React.useMemo(() => {
    if (!historySearchTerm || historySearchTerm.length < 2) return [];
    return filteredUsers.filter(u => u.role === 'aluno' && u.name.toLowerCase().includes(historySearchTerm.toLowerCase())).slice(0, 5);
  }, [historySearchTerm, filteredUsers]);

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile?.role !== 'admin') {
      alert('Erro: Apenas administradores podem realizar esta ação.');
      return;
    }
    if (!editingUser) return;

    try {
      setLoading(true);
      const cleanCpf = editingUser.cpf.replace(/\D/g, '');
      
      const updatedData: Partial<UserProfile> = {
        name: editingUser.name,
        cpf: cleanCpf,
        role: editingUser.role,
      };

      const docId = editingUser.id || editingUser.uid;
      if (!docId) throw new Error("ID do usuário não encontrado.");

      await setDoc(doc(db, 'users', docId), updatedData, { merge: true });
      
      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers();
      alert('Usuário atualizado com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${editingUser.id || editingUser.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentAtivo: boolean) => {
    if (profile?.role !== 'admin') {
      alert('Erro: Apenas administradores podem realizar esta ação.');
      return;
    }
    if (!userId) {
      alert('Erro Crítico: ID do usuário está vazio!');
      return;
    }
    
    const action = currentAtivo ? 'BLOQUEAR' : 'REATIVAR';
    const message = currentAtivo 
      ? 'Deseja realmente BLOQUEAR o acesso deste aluno?' 
      : 'Deseja REATIVAR o acesso deste aluno?';

    if (!window.confirm(message)) return;
    
    try {
      setLoading(true);
      const userRef = doc(db, 'users', userId);
      const newStatus = currentAtivo ? 'inativo' : 'ativo';
      const newAtivo = !currentAtivo;

      await updateDoc(userRef, { 
        status: newStatus, 
        ativo: newAtivo 
      });
      
      // Sincronização imediata na lista
      setUsers(prev => prev.map(u => 
        (u.id === userId || u.uid === userId) 
          ? { ...u, status: newStatus as any, ativo: newAtivo } 
          : u
      ));
      
      // Se estiver editando este usuário, atualiza o estado de edição também
      if (editingUser && (editingUser.id === userId || editingUser.uid === userId)) {
        setEditingUser(prev => prev ? { ...prev, status: newStatus as any, ativo: newAtivo } : null);
      }

      alert(`Acesso ${newAtivo ? 'reativado' : 'bloqueado'} com sucesso!`);
      
      // Fecha o modal após a ação
      setShowEditModal(false);
      setEditingUser(null);
    } catch (error: any) {
      console.error("Erro ao alterar status:", error);
      alert('Erro ao processar solicitação: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddExercise = () => {
    if (!currentEx.name) return;
    const newEx: Exercise = {
      ...currentEx,
      id: `ex-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      order: workoutDivisions[activeDivision].length
    };
    setWorkoutDivisions({
      ...workoutDivisions,
      [activeDivision]: [...workoutDivisions[activeDivision], newEx]
    });
    setCurrentEx({ name: '', sets: '', reps: '', load: '', rest: '', observation: '' });
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
      
      // Multi-point clone: exercises, names, and title
      const clonedDivs = JSON.parse(JSON.stringify(data.divisions || { A: [], B: [], C: [], D: [], E: [] }));
      const clonedNames = JSON.parse(JSON.stringify(data.divisionNames || { A: 'TREINO A', B: 'TREINO B', C: 'TREINO C', D: 'TREINO D', E: 'TREINO E' }));
      const clonedTitle = (data.title || 'Protocolo de Treinamento');

      setWorkoutDivisions(clonedDivs);
      setDivisionNames(clonedNames);
      setWorkoutTitle(clonedTitle);
      
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

  const handleRemoveExercise = (division: WorkoutDivision, id: string) => {
    setWorkoutDivisions({
      ...workoutDivisions,
      [division]: workoutDivisions[division].filter(ex => ex.id !== id)
    });
  };

  const handleSaveWorkout = async () => {
    if (!profile || !targetStudent) return;
    if (profile.role !== 'admin' && profile.role !== 'professor') {
      alert('Erro: Cargo insuficiente para salvar treinos.');
      return;
    }

    const hasAnyExercise = Object.values(workoutDivisions).some((div) => (div as Exercise[]).length > 0);
    if (!hasAnyExercise) {
      alert('Adicione ao menos um exercício em qualquer divisão.');
      return;
    }

    try {
      setLoading(true);
      const workoutData = {
        studentId: targetStudent.id || targetStudent.uid,
        studentName: targetStudent.name,
        teacherId: profile.id || profile.uid,
        teacherName: profile.name,
        title: workoutTitle,
        divisions: workoutDivisions,
        divisionNames: divisionNames,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const workoutsColl = collection(db, 'treinos');
      const q = query(workoutsColl, where('studentId', '==', workoutData.studentId), orderBy('createdAt', 'desc'), limit(1));
      const snap = await getDocs(q);

      if (!snap.empty) {
        await updateDoc(doc(db, 'treinos', snap.docs[0].id), {
          ...workoutData,
          createdAt: snap.docs[0].data().createdAt || workoutData.createdAt
        });
      } else {
        await setDoc(doc(workoutsColl), workoutData);
      }
      
      setShowWorkoutModal(false);
      setTargetStudent(null);
      setWorkoutDivisions({ A: [], B: [], C: [], D: [], E: [] });
      setDivisionNames({ A: 'TREINO A', B: 'TREINO B', C: 'TREINO C', D: 'TREINO D', E: 'TREINO E' });
      setWorkoutTitle('Protocolo de Treinamento');
      alert('Treino salvo e enviado para o aluno!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'treinos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 pt-12 max-w-4xl mx-auto">
      <header className="mb-10 flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-[#FFD700] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Central de Comando</div>
            <h1 className="text-3xl font-black italic uppercase text-white leading-tight">Admin Panel</h1>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Bem-vindo, {profile?.name}</p>
          </div>
          <div className="hidden sm:block opacity-20">
            <Logo size="sm" />
          </div>
        </div>
      </header>

      {/* Main Stats Header - Simplified */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Participantes', value: users.length, icon: Users },
          { label: 'Atletas Ativos', value: users.filter(u => u.role === 'aluno').length, icon: BarChart3 },
          { label: 'Equipe TÉCNICA', value: users.filter(u => u.role !== 'aluno').length, icon: UserPlus },
          { label: 'Unidade MF', value: 'Centro', icon: Flame },
        ].map((stat, i) => (
          <div key={i} className="bg-zinc-900/40 backdrop-blur-md p-5 rounded-[2rem] border border-zinc-800/50 shadow-premium">
            <stat.icon className="text-[#FFD700] mb-3 opacity-50" size={18} />
            <div className="text-2xl font-black italic text-white">{stat.value}</div>
            <div className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main Tabs Navigation Removed as per user request to use BottomNav exclusively */}

      <div className="mb-10">
        <div className="space-y-6">
          {activeMainTab === 'agenda' && isColaboradorOrAdmin && (
            <div className="space-y-6">
              <div className="bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-800/50 relative overflow-hidden group">
                <div className="relative z-10">
                  <h2 className="text-2xl font-black italic uppercase text-white mb-2 leading-none">Gestão de Agenda</h2>
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Controle de consultas e avaliações</p>
                  
                  <div className="mt-8 flex flex-col gap-4">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowAppointmentModal(true)}
                      className="w-full bg-[#FFD700] text-black px-8 py-5 rounded-2xl shadow-xl shadow-[#FFD700]/10 flex items-center justify-center gap-3 transition-all"
                    >
                      <Calendar size={18} />
                      <span className="text-[11px] font-black uppercase tracking-widest">Atribuir Consulta/Avaliação</span>
                    </motion.button>
  
                    <div className="flex w-full bg-zinc-800 rounded-md p-1 my-4">
                      <button 
                        onClick={() => setActiveAgendaTab('ativos')}
                        className={cn(
                          "w-1/2 py-3 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all",
                          activeAgendaTab === 'ativos' ? "bg-zinc-950 text-[#FFD700] shadow-lg" : "text-zinc-400 hover:text-white"
                        )}
                      >
                        Próximos
                      </button>
                      <button 
                        onClick={() => setActiveAgendaTab('historico')}
                        className={cn(
                          "w-1/2 py-3 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all",
                          activeAgendaTab === 'historico' ? "bg-zinc-950 text-[#FFD700] shadow-lg" : "text-zinc-400 hover:text-white"
                        )}
                      >
                        Histórico
                      </button>
                    </div>
                  </div>
                </div>
                <div className="absolute right-0 top-0 w-32 h-32 bg-[#FFD700] opacity-[0.03] rounded-full translate-x-1/2 -translate-y-1/2" />
              </div>

              {activeAgendaTab === 'ativos' ? (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1 mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700]" />
                    Próximos Compromissos
                  </h3>
                  {allAppointments.filter(app => new Date(app.date) >= new Date()).length > 0 ? (
                    allAppointments
                      .filter(app => new Date(app.date) >= new Date())
                      .map(app => {
                        const d = new Date(app.date);
                        return (
                          <div key={app.id} className="relative bg-zinc-900/40 p-5 rounded-3xl border border-zinc-800/30 flex items-center justify-between group hover:border-[#FFD700]/20 transition-all">
                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                              <div className="w-12 h-12 bg-black border border-zinc-800 rounded-2xl flex items-center justify-center text-[#FFD700] font-black shrink-0">
                                {app.services?.includes('Consulta Nutricional') ? <Apple size={20} /> : <ClipboardList size={20} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-white group-hover:text-[#FFD700] transition-colors truncate">
                                  {app.studentName}
                                </div>
                                <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1 flex flex-wrap items-center gap-3">
                                  <span>{app.services?.join(' + ')}</span>
                                  <span className="opacity-30 hidden sm:inline">|</span>
                                  <span className="text-white">{d.toLocaleDateString('pt-BR')} {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                                <div className={cn(
                                  "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border shrink-0",
                                  app.paymentStatus === 'Pago' 
                                    ? "bg-green-500/10 border-green-500/20 text-green-500" 
                                    : "bg-red-500/10 border-red-500/20 text-red-500"
                                )}>
                                  {app.paymentStatus}
                                </div>
                                
                                {isColaboradorOrAdmin && (
                                  <div className="absolute top-3 right-3 flex items-center gap-2 z-[100] pointer-events-auto">
                                    <button 
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        startEditAppointment(app);
                                      }}
                                      className="p-2 hover:bg-[#FFD700]/10 text-zinc-600 hover:text-[#FFD700] transition-all rounded-lg cursor-pointer"
                                    >
                                      <Pencil size={14} className="pointer-events-none" />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={(e) => { 
                                        e.preventDefault(); 
                                        e.stopPropagation(); 
                                        handleDeleteAppointment(app.id); 
                                      }}
                                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all rounded-lg cursor-pointer pointer-events-auto"
                                    >
                                      <Trash2 size={14} className="pointer-events-none" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="py-20 text-center bg-zinc-900/20 rounded-[2rem] border border-dashed border-zinc-800">
                      <Calendar size={32} className="mx-auto mb-4 text-zinc-800" />
                      <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Nenhum agendamento futuro</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative">
                    <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input 
                      type="text"
                      placeholder="BUSCAR ALUNO PARA VER HISTÓRICO..."
                      value={historySearchTerm}
                      onChange={(e) => {
                        setHistorySearchTerm(e.target.value);
                        if (selectedHistoryStudent) {
                          setSelectedHistoryStudent(null);
                          setHistoryResults([]);
                        }
                      }}
                      className="w-full bg-zinc-900/50 border border-zinc-800/50 p-5 pl-14 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-[#FFD700] transition-all"
                    />
                    
                    {currentMatchingStudentsForHistory.length > 0 && !selectedHistoryStudent && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-[100] overflow-hidden">
                        {currentMatchingStudentsForHistory.map(student => (
                          <button
                            key={student.id || student.uid}
                            onClick={() => {
                              setHistorySearchTerm(student.name);
                              fetchHistoryForStudent(student);
                            }}
                            className="w-full text-left p-4 hover:bg-zinc-800 border-b border-zinc-800/50 last:border-0 flex items-center justify-between transition-colors"
                          >
                            <div>
                              <div className="text-sm font-bold text-white tracking-tight uppercase">{student.name}</div>
                              <div className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mt-1">CPF: {student.cpf}</div>
                            </div>
                            <ChevronRight size={14} className="text-zinc-700" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedHistoryStudent && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1 mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700]" />
                        Últimas 3 Consultas: <span className="text-white italic">{selectedHistoryStudent.name}</span>
                      </h3>
                      {loadingHistory ? (
                        <div className="py-10 text-center">
                          <div className="w-8 h-8 border-3 border-[#FFD700] border-t-transparent rounded-full animate-spin mx-auto" />
                        </div>
                      ) : historyResults.length > 0 ? (
                        historyResults.map(app => {
                          const d = new Date(app.date);
                          return (
                            <div 
                              key={app.id} 
                              onClick={() => setSelectedHistoryDetail(app)}
                              className="bg-zinc-900/20 p-5 rounded-3xl border border-zinc-800/30 flex items-center justify-between opacity-60 cursor-pointer hover:bg-zinc-800 transition-colors group"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-black border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 font-black">
                                  {app.services?.includes('Consulta Nutricional') ? <Apple size={20} /> : <ClipboardList size={20} />}
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-zinc-300 italic">
                                    {app.services?.join(' + ')}
                                  </div>
                                  <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-3">
                                    <span>{d.toLocaleDateString('pt-BR')} {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Eye size={14} className="text-zinc-700 group-hover:text-[#FFD700] transition-colors" />
                                <div className="px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border bg-zinc-800/50 border-zinc-700 text-zinc-500">
                                  REALIZADO
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-12 text-center bg-zinc-900/10 rounded-[2rem] border border-dashed border-zinc-800/30">
                          <p className="text-[10px] font-black uppercase text-zinc-700 tracking-widest">
                            NENHUM HISTÓRICO ENCONTRADO PARA ESTE ALUNO
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {!selectedHistoryStudent && historySearchTerm.length >= 2 && currentMatchingStudentsForHistory.length === 0 && (
                    <div className="py-12 text-center bg-zinc-900/10 rounded-[2rem] border border-dashed border-zinc-800/30 text-zinc-700 font-black uppercase text-[10px] tracking-widest">
                      NENHUM ALUNO ENCONTRADO
                    </div>
                  )}
                  
                  {!selectedHistoryStudent && historySearchTerm.length < 2 && (
                    <div className="py-12 text-center bg-zinc-900/10 rounded-[2rem] border border-dashed border-zinc-800/30 text-zinc-700 font-black uppercase text-[10px] tracking-widest">
                      DIGITE O NOME DO ALUNO PARA BUSCAR HISTÓRICO
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {(activeMainTab === 'membros' || activeMainTab === 'treinos') && (
            <div className="space-y-6">
              <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl -mx-6 px-6 py-6 border-b border-zinc-800/50 space-y-6 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-black italic uppercase text-white border-l-4 border-[#FFD700] pl-4">
                      {activeMainTab === 'membros' ? 'GESTÃO DE MEMBROS' : 'GESTÃO DE AGENDA'}
                    </h2>
                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1 ml-4">
                      {activeMainTab === 'membros' ? 'Controle de acesso e perfis' : 'Controle de consultas e avaliações'}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    {activeMainTab === 'membros' && isColaboradorOrAdmin && (
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowAddModal(true)}
                        className="bg-[#FFD700] text-black px-6 py-3 rounded-2xl shadow-xl shadow-[#FFD700]/10 flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
                      >
                        <UserPlus size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Novo Membro</span>
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* ABA ALUNOS: CONTÉUDO EXCLUSIVO */}
                {activeMainTab === 'membros' && (
                  <>
                    {/* Migração de Dados Section */}
                    {isColaboradorOrAdmin && (
                      <div className="bg-zinc-900/40 p-6 rounded-[2rem] border border-zinc-800/50 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#FFD700]/10 flex items-center justify-center text-[#FFD700]">
                            <Upload size={16} />
                          </div>
                          <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-white leading-none">Migração de Dados</h3>
                            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">Importação em massa de atletas</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                          <div className="relative flex-1 w-full">
                            <input 
                              type="file" 
                              accept=".csv"
                              onChange={handleCSVImport}
                              disabled={importingCsv}
                              id="csv-import"
                              className="hidden"
                            />
                            <label 
                              htmlFor="csv-import"
                              className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-xs text-zinc-500 cursor-pointer flex items-center justify-center gap-3 hover:border-zinc-700 transition-all font-bold uppercase tracking-widest"
                            >
                              <Search size={14} /> Selecionar Arquivo CSV (nome, email, telefone)
                            </label>
                          </div>
                          <label 
                            htmlFor="csv-import"
                            className={cn(
                              "w-full sm:w-auto bg-[#FFD700] text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-[#FFD700]/10 hover:bg-yellow-400 transition-all cursor-pointer flex items-center justify-center gap-2",
                              importingCsv && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {importingCsv ? (
                              <>
                                <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                Importando aguarde...
                              </>
                            ) : (
                              <>
                                <Upload size={14} /> Importar Alunos (CSV)
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#FFD700] transition-colors">
                        <Users size={18} />
                      </div>
                      <input 
                        type="text"
                        placeholder="Buscar por nome ou CPF..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-900/40 border border-zinc-800 focus:border-[#FFD700]/50 rounded-2xl py-4 pl-14 pr-6 text-sm text-white placeholder:text-zinc-700 outline-none transition-all shadow-inner"
                      />
                    </div>

                    <div className="space-y-3">
                      {loading ? (
                        <div className="text-center py-20 text-zinc-700 font-bold uppercase tracking-widest animate-pulse">Sincronizando base de dados...</div>
                      ) : filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                          <div key={user.id || user.uid} className="bg-zinc-900/40 backdrop-blur-md p-5 rounded-3xl flex justify-between items-center border border-zinc-800/30 group hover:border-[#FFD700]/30 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center border border-zinc-800 text-zinc-600 group-hover:text-[#FFD700] transition-colors">
                                <User size={20} />
                              </div>
                              <div>
                                <div className="font-bold text-white group-hover:text-[#FFD700] transition-colors">{user.name}</div>
                                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-tighter mt-0.5 flex items-center gap-2">
                                  <span className={cn("px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest text-black", 
                                    user.role === 'admin' ? "bg-red-500" : user.role === 'professor' ? "bg-[#FFD700]" : user.role === 'colaborador' ? "bg-blue-400" : "bg-zinc-700 text-zinc-300"
                                  )}>
                                    {user.role}
                                  </span>
                                  {user.ativo === false && (
                                    <span className="bg-red-500/10 text-red-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">
                                      BLOQUEADO
                                    </span>
                                  )}
                                  <span className="opacity-50">|</span>
                                  <span>CPF: {user.cpf}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isAdminOrProfessor && (
                                <button 
                                  onClick={async () => {
                                    setTargetStudent(user);
                                    setShowWorkoutModal(true);
                                    try {
                                      const q = query(collection(db, 'treinos'), where('studentId', '==', user.id || user.uid), orderBy('createdAt', 'desc'), limit(1));
                                      const snap = await getDocs(q);
                                      if (!snap.empty) {
                                        const data = snap.docs[0].data();
                                        setWorkoutDivisions(data.divisions || { A: [], B: [], C: [], D: [], E: [] });
                                        setDivisionNames(data.divisionNames || { A: 'TREINO A', B: 'TREINO B', C: 'TREINO C', D: 'TREINO D', E: 'TREINO E' });
                                        setWorkoutTitle(data.title || 'Protocolo de Treinamento');
                                      } else {
                                        setWorkoutDivisions({ A: [], B: [], C: [], D: [], E: [] });
                                        setDivisionNames({ A: 'TREINO A', B: 'TREINO B', C: 'TREINO C', D: 'TREINO D', E: 'TREINO E' });
                                        setWorkoutTitle('Protocolo de Treinamento');
                                      }
                                    } catch (e) {
                                      console.error(e);
                                    }
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 bg-[#FFD700]/10 hover:bg-[#FFD700] text-[#FFD700] hover:text-black border border-[#FFD700]/20 rounded-xl transition-all"
                                >
                                  <Dumbbell size={16} />
                                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Montar Treino</span>
                                </button>
                              )}
                              {isAdmin && (
                                <button 
                                  onClick={() => {
                                    setEditingUser(user);
                                    setShowEditModal(true);
                                  }}
                                  className="p-3 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-500 hover:text-[#FFD700] border border-zinc-800/50 rounded-xl transition-all"
                                >
                                  <Pencil size={18} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bg-zinc-900/20 border border-dashed border-zinc-800 rounded-[2.5rem] py-20 text-center">
                          <Users size={40} className="mx-auto text-zinc-800 mb-4" />
                          <p className="text-zinc-500 text-sm font-medium italic">
                            {searchTerm ? 'Nenhum membro encontrado com este termo.' : 'Nenhum membro cadastrado.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-[95%] max-w-lg mx-auto bg-zinc-950 rounded-t-[3rem] sm:rounded-[3rem] p-6 sm:p-12 shadow-2xl border border-zinc-800 shadow-[#FFD700]/5 max-h-[85vh] overflow-y-auto overflow-x-hidden"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-3xl font-black italic uppercase text-white leading-none">Matrícula</h3>
                  <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mt-2">Novos membros Multy Forças</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-zinc-700 hover:text-white transition-colors">
                  <Logo size="sm" />
                </button>
              </div>

              <form onSubmit={handleAddUser} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black ml-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-[#FFD700] outline-none transition-all font-medium"
                    placeholder="Ex: Jhonatan Silva"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black ml-1">CPF (11 dígitos)</label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    value={formData.cpf}
                    onChange={e => setFormData({...formData, cpf: e.target.value.replace(/\D/g, '')})}
                    className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-[#FFD700] outline-none transition-all font-medium"
                    placeholder="00000000000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black ml-1">Cargo / Hierarquia</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                    className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-[#FFD700] outline-none appearance-none font-bold uppercase tracking-widest text-xs"
                  >
                    <option value="aluno">Aluno (Atleta)</option>
                    <option value="professor">Professor (Multy Trainer)</option>
                    <option value="colaborador">Colaborador (Equipe)</option>
                    <option value="admin">Administrador (Mestre)</option>
                  </select>
                </div>
                
                <div className="pt-6 flex flex-col sm:flex-row gap-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-8 py-4 rounded-2xl border border-zinc-800 font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-all text-xs"
                  >
                    Abortar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-8 py-4 rounded-2xl bg-[#FFD700] text-black font-black uppercase tracking-widest text-xs shadow-xl shadow-[#FFD700]/10 hover:bg-yellow-400 transition-all"
                  >
                    Confirmar Cadastro
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showEditModal && editingUser && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowEditModal(false);
                setEditingUser(null);
              }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-[95%] max-w-lg mx-auto bg-zinc-950 rounded-t-[3rem] sm:rounded-[3rem] p-6 sm:p-12 shadow-2xl border border-zinc-800 shadow-[#FFD700]/5 max-h-[85vh] overflow-y-auto overflow-x-hidden"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-3xl font-black italic uppercase text-white leading-none">Alterar Perfil</h3>
                  <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mt-2">Atualize os dados na base Multy Forças</p>
                </div>
                <button onClick={() => setShowEditModal(false)} className="text-zinc-700 hover:text-white transition-colors">
                  <Logo size="sm" />
                </button>
              </div>

              <form onSubmit={handleEditUser} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black ml-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={editingUser.name}
                    onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                    className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-[#FFD700] outline-none transition-all font-medium"
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black ml-1">CPF (Apenas números)</label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    value={editingUser.cpf}
                    onChange={e => setEditingUser({...editingUser, cpf: e.target.value.replace(/\D/g, '')})}
                    className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-[#FFD700] outline-none transition-all font-medium"
                    placeholder="00000000000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black ml-1">Cargo / Hierarquia</label>
                  <select
                    value={editingUser.role}
                    onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}
                    className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-[#FFD700] outline-none appearance-none font-bold uppercase tracking-widest text-xs"
                  >
                    <option value="aluno">Aluno (Atleta)</option>
                    <option value="professor">Professor (Multy Trainer)</option>
                    <option value="colaborador">Colaborador (Equipe)</option>
                    <option value="admin">Administrador (Mestre)</option>
                  </select>
                </div>
                
                <div className="pt-6 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingUser(null);
                      }}
                      className="flex-1 px-8 py-4 rounded-2xl border border-zinc-800 font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-all text-xs"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-8 py-4 rounded-2xl bg-[#FFD700] text-black font-black uppercase tracking-widest text-xs shadow-xl shadow-[#FFD700]/10 hover:bg-yellow-400 transition-all font-bold"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                  
                  {isAdmin && (
                    <div className="border-t border-zinc-900 pt-6 mt-2">
                      <button 
                        type="button" 
                        className="btn-danger"
                        onClick={async (e) => {
                          e.preventDefault();
                          if (profile?.role !== 'admin') return alert('Erro: Apenas administradores podem realizar esta ação.');
                          if (!editingUser || !editingUser.id) return alert('Erro: ID não encontrado.');
                          
                          const novoStatus = editingUser.ativo === false ? true : false;
                          const acao = novoStatus ? 'REATIVAR' : 'BLOQUEAR';
                          
                          try {
                             const docRef = doc(db, 'users', editingUser.id);
                             await updateDoc(docRef, { 
                               ativo: novoStatus, 
                               status: novoStatus ? 'ativo' : 'inativo' 
                             });
                             
                             // Atualiza a lista na tela
                             setUsers(prev => prev.map(u => 
                               u.id === editingUser.id ? { ...u, ativo: novoStatus, status: novoStatus ? 'ativo' : 'inativo' } : u
                             ));
                             
                             // Fecha o modal e limpa o estado de edição
                             setEditingUser(null);
                             setShowEditModal(false);
                             
                             alert(`✅ Membro ${novoStatus ? 'Reativado' : 'Bloqueado'} com sucesso!`);
                          } catch(erro: any) { 
                             alert('❌ Erro ao atualizar status: ' + erro.message); 
                          }
                        }}
                      >
                        {editingUser?.ativo === false ? '🟢 REATIVAR ACESSO' : '🔴 BLOQUEAR ACESSO'}
                      </button>
                    </div>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showWorkoutModal && targetStudent && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWorkoutModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-[95%] max-w-2xl mx-auto bg-zinc-950 rounded-t-[3rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl border border-zinc-800 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col gap-3 w-full">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-black italic uppercase text-white leading-none">Prescrição de Treino</h3>
                      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-2">Atleta: <span className="text-[#FFD700]">{targetStudent.name}</span></p>
                    </div>
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="bg-zinc-900 text-zinc-400 hover:text-[#FFD700] px-4 py-2 rounded-xl border border-zinc-800 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                    >
                      <Download size={14} /> Importar Treino Base
                    </button>
                  </div>
                </div>
                <button onClick={() => setShowWorkoutModal(false)} className="text-zinc-700 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black">Título do Protocolo</label>
                    <input
                      type="text"
                      value={workoutTitle}
                      onChange={e => setWorkoutTitle(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-[#FFD700] outline-none font-bold italic uppercase"
                    />
                  </div>

                  <div className="flex gap-1 p-1 bg-zinc-900 rounded-2xl border border-zinc-800">
                    {(['A', 'B', 'C', 'D', 'E'] as WorkoutDivision[]).map((div) => (
                      <button
                        key={div}
                        onClick={() => setActiveDivision(div)}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          activeDivision === div 
                            ? "bg-[#FFD700] text-black shadow-lg" 
                            : "text-zinc-500 hover:text-white"
                        )}
                      >
                        {divisionNames[div] || `Ficha ${div}`}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-black ml-1">Nome da Ficha {activeDivision}</label>
                    <input
                      type="text"
                      placeholder="Ex: Superiores e Cardio"
                      value={divisionNames[activeDivision]}
                      onChange={e => setDivisionNames({...divisionNames, [activeDivision]: e.target.value.toUpperCase()})}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-[#FFD700] outline-none font-bold italic uppercase placeholder-zinc-800"
                    />
                  </div>
                </div>

                <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FFD700]">Adicionar Exercício ao {divisionNames[activeDivision]}</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <input
                      placeholder="Nome do Exercício"
                      value={currentEx.name}
                      onChange={e => setCurrentEx({...currentEx, name: e.target.value})}
                      className="bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-[#FFD700] outline-none"
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <label className="text-[8px] uppercase tracking-widest text-zinc-600 font-bold ml-1">Séries</label>
                        <input
                          placeholder="Ex: 4"
                          value={currentEx.sets}
                          onChange={e => setCurrentEx({...currentEx, sets: e.target.value})}
                          className="bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-[#FFD700] outline-none text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] uppercase tracking-widest text-zinc-600 font-bold ml-1">Reps</label>
                        <input
                          placeholder="Ex: 12"
                          value={currentEx.reps}
                          onChange={e => setCurrentEx({...currentEx, reps: e.target.value})}
                          className="bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-[#FFD700] outline-none text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] uppercase tracking-widest text-zinc-600 font-bold ml-1">Carga</label>
                        <input
                          placeholder="Ex: 20kg"
                          value={currentEx.load}
                          onChange={e => setCurrentEx({...currentEx, load: e.target.value})}
                          className="bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-[#FFD700] outline-none text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] uppercase tracking-widest text-zinc-600 font-bold ml-1">Descanso</label>
                        <input
                          placeholder="Ex: 60s"
                          value={currentEx.rest}
                          onChange={e => setCurrentEx({...currentEx, rest: e.target.value})}
                          className="bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-[#FFD700] outline-none text-center"
                        />
                      </div>
                    </div>
                  </div>
                  <textarea
                    placeholder="Observações técnicas (ex: Foco na descida)"
                    value={currentEx.observation}
                    onChange={e => setCurrentEx({...currentEx, observation: e.target.value})}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-[#FFD700] outline-none h-20 resize-none"
                  />
                  <button 
                    onClick={handleAddExercise}
                    className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all"
                  >
                    <Plus size={16} /> Incluir no Treino {activeDivision}
                  </button>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Listagem: Treino {activeDivision} ({workoutDivisions[activeDivision].length})</h4>
                  {workoutDivisions[activeDivision].map((ex, idx) => (
                    <div key={ex.id} className="bg-black border border-zinc-800 p-4 rounded-xl flex justify-between items-center group">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-500">{idx + 1}</div>
                        <div>
                          <div className="text-sm font-bold text-white uppercase italic">{ex.name}</div>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[8px] text-[#FFD700] font-black uppercase tracking-widest">{ex.sets} x {ex.reps}</span>
                            {ex.load && <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">| {ex.load}</span>}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveExercise(activeDivision, ex.id)} className="p-2 text-zinc-700 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-zinc-900 flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => setShowWorkoutModal(false)}
                  className="flex-1 py-4 rounded-xl border border-zinc-800 font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all text-[10px]"
                >
                  Descartar
                </button>
                <button 
                  onClick={handleSaveWorkout}
                  disabled={loading}
                  className="flex-1 py-4 rounded-xl bg-[#FFD700] text-black font-black uppercase tracking-widest text-[10px] shadow-xl shadow-[#FFD700]/10 hover:bg-yellow-400 transition-all disabled:opacity-50"
                >
                  {loading ? 'SALVANDO...' : 'SALVAR TREINO'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Workout Modal */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-[95%] max-w-md mx-auto bg-zinc-950 border border-zinc-800 rounded-[3rem] p-6 sm:p-8 shadow-2xl relative flex flex-col max-h-[85vh] overflow-y-auto overflow-x-hidden"
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
                {users
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
                
                {users.filter(u => u.name.toLowerCase().includes(importSearch.toLowerCase())).length === 0 && (
                  <div className="py-10 text-center text-zinc-700 font-black uppercase text-[10px] tracking-widest">
                    Nenhum resultado
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Appointment Scheduling Modal */}
      <AnimatePresence>
        {showAppointmentModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-[95%] max-w-xl mx-auto bg-zinc-950 border border-zinc-800 rounded-[3rem] p-6 sm:p-12 shadow-2xl relative flex flex-col max-h-[85vh] overflow-y-auto overflow-x-hidden"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-black italic uppercase text-white leading-none">
                    {editingAppointmentId ? 'Editar Consulta' : 'Agendar Consulta'}
                  </h3>
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-2 border-l-2 border-[#FFD700] pl-3">Designação de Avaliação/Consulta</p>
                </div>
                <button 
                  onClick={() => {
                    setShowAppointmentModal(false);
                    setEditingAppointmentId(null);
                    setSelectedStudentForApp(null);
                  }} 
                  className="bg-zinc-900 p-2 rounded-xl text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {!selectedStudentForApp && !editingAppointmentId ? (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="relative mb-6">
                    <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input
                      type="text"
                      placeholder="Pesquisar atleta para agendamento..."
                      value={appointmentSearch}
                      onChange={e => setAppointmentSearch(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-2xl py-5 pl-14 pr-6 text-sm text-white focus:border-[#FFD700] outline-none transition-all placeholder-zinc-700"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                    {users
                      .filter(u => u.role === 'aluno' && u.name.toLowerCase().includes(appointmentSearch.toLowerCase()))
                      .sort((a,b) => a.name.localeCompare(b.name))
                      .map(student => (
                      <button
                        key={student.id || student.uid}
                        onClick={() => setSelectedStudentForApp(student)}
                        className="w-full p-5 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl flex items-center justify-between group hover:border-[#FFD700]/30 transition-all text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-black border border-zinc-800 flex items-center justify-center text-[#FFD700] font-black text-xs uppercase italic">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white group-hover:text-[#FFD700] transition-colors">{student.name}</div>
                            <div className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mt-1">CPF: {student.cpf}</div>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-zinc-800 group-hover:text-[#FFD700] transition-all" />
                      </button>
                    ))}
                    {users.filter(u => u.role === 'aluno' && u.name.toLowerCase().includes(appointmentSearch.toLowerCase())).length === 0 && (
                      <div className="py-20 text-center text-zinc-800 font-black uppercase text-[10px] tracking-[0.2em]">
                        Nenhum atleta encontrado
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveAppointment} className="flex-1 overflow-y-auto pr-2 scrollbar-hide space-y-8">
                  <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#FFD700] rounded-2xl flex items-center justify-center text-black shadow-lg shadow-[#FFD700]/20">
                        <User size={24} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">
                          {editingAppointmentId ? 'Editando agendamento para:' : 'Agendando para:'}
                        </div>
                        <div className="text-lg font-black uppercase italic text-white leading-none truncate">
                          {selectedStudentForApp?.name}
                        </div>
                      </div>
                    </div>
                    {!editingAppointmentId && (
                      <button 
                        type="button"
                        onClick={() => setSelectedStudentForApp(null)}
                        className="text-[9px] font-black uppercase text-[#FFD700] hover:underline"
                      >
                        Trocar Atleta
                      </button>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 block ml-1">Tipo de Serviço (Selecione um ou mais)</label>
                      <div className="grid grid-cols-2 gap-3">
                        {['Avaliação Física', 'Consulta Nutricional'].map(service => (
                          <button
                            key={service}
                            type="button"
                            onClick={() => {
                              const current = appointmentForm.services;
                              if (current.includes(service)) {
                                setAppointmentForm({ ...appointmentForm, services: current.filter(s => s !== service) });
                              } else {
                                setAppointmentForm({ ...appointmentForm, services: [...current, service] });
                              }
                            }}
                            className={cn(
                              "p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all",
                              appointmentForm.services.includes(service)
                                ? "bg-[#FFD700]/10 border-[#FFD700] text-[#FFD700]"
                                : "bg-black border-zinc-800 text-zinc-600 hover:border-zinc-700"
                            )}
                          >
                            {service}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="w-full">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block ml-1">Data</label>
                          <input 
                            type="date" 
                            value={data}
                            onChange={(e) => setData(e.target.value)} 
                            className="w-full bg-black text-white p-5 border border-zinc-800 rounded-2xl focus:outline-none focus:border-[#FFD700] transition-all cursor-pointer" 
                            style={{ colorScheme: 'dark' }} 
                            required 
                          />
                        </div>
                        <div className="w-full">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block ml-1">Hora</label>
                          <input 
                            type="time" 
                            value={hora}
                            onChange={(e) => setHora(e.target.value)} 
                            className="w-full bg-black text-white p-5 border border-zinc-800 rounded-2xl focus:outline-none focus:border-[#FFD700] transition-all cursor-pointer" 
                            style={{ colorScheme: 'dark' }} 
                            required 
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block ml-1">Observações Internas (Opcional)</label>
                      <textarea
                        value={appointmentForm.observation}
                        onChange={e => setAppointmentForm({ ...appointmentForm, observation: e.target.value })}
                        placeholder="Ex: Primeira avaliação pós-férias..."
                        rows={3}
                        className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-sm text-white focus:border-[#FFD700] outline-none transition-all resize-none placeholder-zinc-800"
                      />
                    </div>

                    <div className="flex items-center justify-between bg-zinc-900/30 p-5 rounded-3xl border border-zinc-800/50">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-white leading-none">Status de Pagamento</div>
                        <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-wider mt-1">Controle Financeiro Direto</p>
                      </div>
                      <div className="flex bg-black p-1 rounded-xl border border-zinc-800">
                        {(['Pago', 'Pendente'] as const).map(status => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setAppointmentForm({ ...appointmentForm, paymentStatus: status })}
                            className={cn(
                              "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                              appointmentForm.paymentStatus === status
                                ? (status === 'Pago' ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500")
                                : "text-zinc-600 hover:text-zinc-400"
                            )}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAppointmentModal(false);
                          setEditingAppointmentId(null);
                          setSelectedStudentForApp(null);
                        }}
                        className="py-5 bg-zinc-900 text-zinc-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:text-white transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="py-5 bg-[#FFD700] text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-yellow-400 transition-all shadow-xl shadow-[#FFD700]/10 disabled:opacity-50"
                      >
                        {loading ? 'PROCESSANDO...' : (editingAppointmentId ? 'ATUALIZAR' : 'SALVAR AGENDAMENTO')}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modal de Detalhes da Consulta (Read-Only) */}
      <AnimatePresence>
        {selectedHistoryDetail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedHistoryDetail(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <div className="text-[#FFD700] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Histórico de Sessão</div>
                    <h2 className="text-2xl font-black italic uppercase text-white leading-none">Detalhes da Consulta</h2>
                  </div>
                  <button 
                    onClick={() => setSelectedHistoryDetail(null)}
                    className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-500"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Info Header */}
                  <div className="bg-black/40 p-6 rounded-3xl border border-zinc-800/50 flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#FFD700] rounded-2xl flex items-center justify-center text-black">
                      {selectedHistoryDetail.services?.includes('Consulta Nutricional') ? <Apple size={24} /> : <ClipboardList size={24} />}
                    </div>
                    <div>
                      <div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-1 italic">Data da Realização</div>
                      <div className="text-lg font-black text-white italic truncate uppercase">
                        {new Date(selectedHistoryDetail.date).toLocaleDateString('pt-BR')} às {new Date(selectedHistoryDetail.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {/* Detalhes do Aluno */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800/50">
                      <div className="text-[8px] text-zinc-600 font-black uppercase tracking-widest mb-2">Aluno</div>
                      <div className="text-xs font-bold text-zinc-300 uppercase">{selectedHistoryDetail.studentName}</div>
                    </div>
                    <div className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800/50">
                      <div className="text-[8px] text-zinc-600 font-black uppercase tracking-widest mb-2">Pagamento</div>
                      <div className={cn(
                        "text-xs font-bold uppercase",
                        selectedHistoryDetail.paymentStatus === 'Pago' ? "text-green-500" : "text-red-500"
                      )}>
                        {selectedHistoryDetail.paymentStatus}
                      </div>
                    </div>
                  </div>

                  {/* Serviços */}
                  <div>
                    <div className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-3 ml-1">Serviços Prestados</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedHistoryDetail.services?.map((s: string) => (
                        <span key={s} className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-[10px] font-black text-zinc-400 uppercase italic">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Observações */}
                  <div>
                    <div className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-3 ml-1">Observações Internas</div>
                    <div className="bg-black/30 p-5 rounded-2xl border border-zinc-800/50 min-h-[100px]">
                      <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                        {selectedHistoryDetail.observation || 'Nenhuma observação registrada para esta sessão.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    onClick={() => setSelectedHistoryDetail(null)}
                    className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                  >
                    Fechar Detalhes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
