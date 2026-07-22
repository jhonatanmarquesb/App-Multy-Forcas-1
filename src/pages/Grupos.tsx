import React, { useState, useEffect } from 'react';
import {
  collection, query, where, getDocs, addDoc, updateDoc, doc, arrayUnion, arrayRemove, getDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Grupo, UserProfile } from '../types';
import {
  Users, Plus, Lock, Globe, LogIn, Crown, Flame, ArrowLeft, Copy, Check,
  X, ShieldCheck, DoorOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from '../lib/toast';

const gerarCodigo = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem O/0/I/1 pra evitar confusão
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

interface GrupoComMembros extends Grupo {
  membrosDados: UserProfile[];
}

export const GruposPanel: React.FC = () => {
  const { user, profile } = useAuth();
  const [meusGrupos, setMeusGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [grupoAberto, setGrupoAberto] = useState<GrupoComMembros | null>(null);
  const [loadingGrupo, setLoadingGrupo] = useState(false);

  const [showCriar, setShowCriar] = useState(false);
  const [showEntrar, setShowEntrar] = useState(false);

  useEffect(() => {
    if (user) fetchMeusGrupos();
  }, [user]);

  const fetchMeusGrupos = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'grupos'), where('membros', 'array-contains', user.uid));
      const snap = await getDocs(q);
      setMeusGrupos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Grupo)));
    } catch (err) {
      console.error(err);
      toast('Não deu pra carregar seus grupos agora.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const abrirGrupo = async (grupo: Grupo) => {
    setLoadingGrupo(true);
    try {
      // Busca os perfis dos membros para montar o ranking interno do grupo.
      // Grupos de amigos costumam ser pequenos, então N leituras é tranquilo.
      const perfis = await Promise.all(
        grupo.membros.map(async (uid) => {
          const snap = await getDoc(doc(db, 'users', uid));
          return snap.exists() ? ({ uid, ...snap.data() } as UserProfile) : null;
        })
      );
      const membrosDados = perfis
        .filter((p): p is UserProfile => p !== null)
        .sort((a, b) => (b.treinosConcluidos || 0) - (a.treinosConcluidos || 0));
      setGrupoAberto({ ...grupo, membrosDados });
    } catch (err) {
      console.error(err);
      toast('Não deu pra abrir esse grupo agora.', 'error');
    } finally {
      setLoadingGrupo(false);
    }
  };

  const sairDoGrupo = async (grupo: Grupo) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'grupos', grupo.id!), { membros: arrayRemove(user.uid) });
      toast(`Você saiu do grupo "${grupo.nome}".`, 'info');
      setGrupoAberto(null);
      fetchMeusGrupos();
    } catch (err) {
      console.error(err);
      toast('Não deu pra sair do grupo agora.', 'error');
    }
  };

  if (grupoAberto) {
    return (
      <GrupoDetalhe
        grupo={grupoAberto}
        loading={loadingGrupo}
        meuUid={user?.uid}
        souCriador={grupoAberto.criadorId === user?.uid}
        onVoltar={() => setGrupoAberto(null)}
        onSair={() => sairDoGrupo(grupoAberto)}
      />
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowCriar(true)}
          className="flex flex-col items-center gap-2 py-5 rounded-[1.75rem] bg-[#FFD700] text-black font-display uppercase tracking-wide text-sm shadow-lg shadow-[#FFD700]/10"
        >
          <Plus size={22} strokeWidth={2.5} />
          Criar Grupo
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowEntrar(true)}
          className="flex flex-col items-center gap-2 py-5 rounded-[1.75rem] bg-zinc-900/60 border border-zinc-800 text-white font-display uppercase tracking-wide text-sm"
        >
          <LogIn size={22} strokeWidth={2.5} />
          Entrar com Código
        </motion.button>
      </div>

      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 px-1">Meus grupos</div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map(i => <div key={i} className="skeleton h-20 rounded-[1.75rem]" />)}
        </div>
      ) : meusGrupos.length === 0 ? (
        <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-[2rem] py-14 text-center px-6">
          <Users size={32} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-400 text-sm font-black italic uppercase">Você ainda não tem grupos</p>
          <p className="text-zinc-600 text-[11px] mt-1.5 leading-relaxed">Crie um grupo com seus amigos ou entre em um já existente com o código.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {meusGrupos.map((g, i) => (
              <motion.button
                key={g.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => abrirGrupo(g)}
                className="w-full p-5 rounded-[1.75rem] bg-zinc-900/50 border border-zinc-800/60 flex items-center gap-4 text-left hover:border-zinc-700 transition-colors"
              >
                <div className={cn(
                  'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border',
                  g.publico ? 'bg-black/40 border-zinc-800 text-zinc-500' : 'bg-[#FFD700]/10 border-[#FFD700]/30 text-[#FFD700]'
                )}>
                  {g.publico ? <Globe size={18} /> : <Lock size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black uppercase italic text-white truncate">{g.nome}</div>
                  <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                    {g.membros.length} {g.membros.length === 1 ? 'membro' : 'membros'} · {g.publico ? 'Público' : 'Privado'}
                  </div>
                </div>
                {g.criadorId === user?.uid && (
                  <span className="text-[8px] font-black uppercase px-2 py-1 rounded-full bg-zinc-800 text-zinc-400 shrink-0">Dono</span>
                )}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showCriar && (
          <CriarGrupoModal
            onClose={() => setShowCriar(false)}
            onCreated={() => { setShowCriar(false); fetchMeusGrupos(); }}
          />
        )}
        {showEntrar && (
          <EntrarGrupoModal
            onClose={() => setShowEntrar(false)}
            onJoined={() => { setShowEntrar(false); fetchMeusGrupos(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Detalhe do grupo (ranking interno) ---------------------------------------
const GrupoDetalhe: React.FC<{
  grupo: GrupoComMembros;
  loading: boolean;
  meuUid?: string;
  souCriador: boolean;
  onVoltar: () => void;
  onSair: () => void;
}> = ({ grupo, loading, meuUid, souCriador, onVoltar, onSair }) => {
  const [copiado, setCopiado] = useState(false);

  const copiarCodigo = () => {
    navigator.clipboard?.writeText(grupo.codigo).then(() => {
      setCopiado(true);
      toast('Código copiado! Manda pro seu amigo.', 'success');
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  return (
    <div>
      <button onClick={onVoltar} className="flex items-center gap-2 text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-wider mb-5 transition-colors">
        <ArrowLeft size={16} /> Meus grupos
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[#FFD700] text-[10px] font-black uppercase tracking-[0.2em] mb-1">
            {grupo.publico ? 'Grupo público' : 'Grupo privado'}
          </div>
          <h2 className="text-2xl font-display uppercase text-white leading-tight">{grupo.nome}</h2>
        </div>
        {!souCriador && (
          <motion.button whileTap={{ scale: 0.94 }} onClick={onSair} className="flex items-center gap-1.5 text-red-500/80 hover:text-red-400 text-[10px] font-black uppercase px-3 py-2 rounded-xl border border-red-900/30 bg-red-950/10 shrink-0">
            <DoorOpen size={13} /> Sair
          </motion.button>
        )}
      </div>

      <button
        onClick={copiarCodigo}
        className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 mb-6 hover:border-[#FFD700]/30 transition-colors"
      >
        <div className="text-left">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Código do grupo</div>
          <div className="font-display text-xl text-[#FFD700] tracking-[0.15em] mt-0.5">{grupo.codigo}</div>
        </div>
        {copiado ? <Check size={18} className="text-[#FFD700]" /> : <Copy size={18} className="text-zinc-500" />}
      </button>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {grupo.membrosDados.map((m, i) => {
            const isMe = m.uid === meuUid;
            return (
              <motion.div
                key={m.uid}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'p-4 rounded-2xl flex items-center gap-4 border',
                  isMe ? 'bg-[#FFD700]/10 border-[#FFD700] glow-pulse' : 'bg-zinc-900/40 border-zinc-800/50'
                )}
              >
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center font-display text-base shrink-0',
                  i === 0 ? 'bg-[#FFD700] text-black' : 'bg-black/40 border border-zinc-800 text-zinc-500'
                )}>
                  {i === 0 ? <Crown size={16} /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn('font-black uppercase italic truncate', isMe ? 'text-[#FFD700]' : 'text-white')}>
                    {m.name}{isMe && <span className="ml-2 text-[8px] bg-[#FFD700] text-black px-1.5 py-0.5 rounded-full">VOCÊ</span>}
                  </div>
                  <div className="flex items-center gap-1 text-zinc-500 text-[10px] font-bold mt-0.5">
                    <Flame size={10} className="text-[#FFD700]" /> {m.streak || 0} dias de sequência
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-white text-lg">{m.treinosConcluidos || 0}</div>
                  <div className="text-zinc-600 text-[7px] font-bold uppercase tracking-widest">Treinos</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- Modal: Criar grupo --------------------------------------------------------
const CriarGrupoModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const { user, profile } = useAuth();
  const [nome, setNome] = useState('');
  const [publico, setPublico] = useState(true);
  const [senha, setSenha] = useState('');
  const [saving, setSaving] = useState(false);

  const criar = async () => {
    if (!user || !profile) return;
    if (!nome.trim()) { toast('Dá um nome pro grupo antes de criar.', 'error'); return; }
    if (!publico && senha.trim().length < 4) { toast('A senha do grupo privado precisa ter pelo menos 4 caracteres.', 'error'); return; }

    setSaving(true);
    try {
      const novoGrupo: Omit<Grupo, 'id'> = {
        nome: nome.trim().slice(0, 60),
        criadorId: user.uid,
        criadorNome: profile.name,
        publico,
        codigo: gerarCodigo(),
        membros: [user.uid],
        createdAt: new Date().toISOString(),
        ...(publico ? {} : { senha: senha.trim() }),
      };
      await addDoc(collection(db, 'grupos'), novoGrupo);
      toast(`Grupo "${novoGrupo.nome}" criado! Código: ${novoGrupo.codigo}`, 'success');
      onCreated();
    } catch (err) {
      console.error(err);
      toast('Não deu pra criar o grupo agora.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm" />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        className="fixed inset-x-0 bottom-0 z-[91] max-w-2xl mx-auto bg-zinc-900 border-t border-[#FFD700]/20 rounded-t-[2rem] p-6 pb-10 safe-bottom max-h-[85vh] overflow-y-auto"
      >
        <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto mb-5" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-display uppercase text-white">Criar Grupo</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2 block">Nome do grupo</label>
            <input
              value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60}
              placeholder="Ex: Rachas da Multy"
              className="w-full px-4 py-4 bg-black/40 border border-zinc-800 rounded-2xl text-white placeholder-zinc-700 focus:outline-none focus:border-[#FFD700] transition-colors font-medium"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2 block">Visibilidade</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPublico(true)}
                className={cn('flex flex-col items-center gap-2 py-4 rounded-2xl border transition-colors', publico ? 'bg-[#FFD700] text-black border-[#FFD700]' : 'bg-black/30 text-zinc-500 border-zinc-800')}
              >
                <Globe size={20} />
                <span className="font-black uppercase text-[10px] tracking-wider">Público</span>
              </button>
              <button
                onClick={() => setPublico(false)}
                className={cn('flex flex-col items-center gap-2 py-4 rounded-2xl border transition-colors', !publico ? 'bg-[#FFD700] text-black border-[#FFD700]' : 'bg-black/30 text-zinc-500 border-zinc-800')}
              >
                <Lock size={20} />
                <span className="font-black uppercase text-[10px] tracking-wider">Privado</span>
              </button>
            </div>
            <p className="text-zinc-600 text-[10px] mt-2 leading-relaxed">
              {publico ? 'Qualquer aluno pode encontrar e entrar com o código do grupo.' : 'Só entra quem tiver o código e a senha que você definir.'}
            </p>
          </div>

          <AnimatePresence>
            {!publico && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2 block">Senha do grupo</label>
                <input
                  value={senha} onChange={(e) => setSenha(e.target.value)} maxLength={30} type="text"
                  placeholder="Mínimo 4 caracteres"
                  className="w-full px-4 py-4 bg-black/40 border border-zinc-800 rounded-2xl text-white placeholder-zinc-700 focus:outline-none focus:border-[#FFD700] transition-colors font-medium"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={criar}
            disabled={saving}
            className="w-full py-5 bg-[#FFD700] text-black rounded-2xl font-display uppercase tracking-widest text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><ShieldCheck size={18} /> Criar grupo</>}
          </motion.button>
        </div>
      </motion.div>
    </>
  );
};

// --- Modal: Entrar em grupo por código -----------------------------------------
const EntrarGrupoModal: React.FC<{ onClose: () => void; onJoined: () => void }> = ({ onClose, onJoined }) => {
  const { user } = useAuth();
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [grupoEncontrado, setGrupoEncontrado] = useState<Grupo | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [entrando, setEntrando] = useState(false);

  const buscar = async () => {
    if (codigo.trim().length < 6) { toast('O código tem 6 caracteres.', 'error'); return; }
    setBuscando(true);
    setGrupoEncontrado(null);
    try {
      const q = query(collection(db, 'grupos'), where('codigo', '==', codigo.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        toast('Nenhum grupo encontrado com esse código.', 'error');
        return;
      }
      const g = { id: snap.docs[0].id, ...snap.docs[0].data() } as Grupo;
      if (user && g.membros.includes(user.uid)) {
        toast('Você já faz parte desse grupo!', 'info');
        onJoined();
        return;
      }
      setGrupoEncontrado(g);
    } catch (err) {
      console.error(err);
      toast('Erro ao buscar o grupo.', 'error');
    } finally {
      setBuscando(false);
    }
  };

  const entrar = async () => {
    if (!user || !grupoEncontrado) return;
    if (!grupoEncontrado.publico && senha !== grupoEncontrado.senha) {
      toast('Senha incorreta para esse grupo.', 'error');
      return;
    }
    setEntrando(true);
    try {
      await updateDoc(doc(db, 'grupos', grupoEncontrado.id!), { membros: arrayUnion(user.uid) });
      toast(`Você entrou no grupo "${grupoEncontrado.nome}"! 🔥`, 'success');
      onJoined();
    } catch (err) {
      console.error(err);
      toast('Não deu pra entrar no grupo agora.', 'error');
    } finally {
      setEntrando(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm" />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        className="fixed inset-x-0 bottom-0 z-[91] max-w-2xl mx-auto bg-zinc-900 border-t border-[#FFD700]/20 rounded-t-[2rem] p-6 pb-10 safe-bottom max-h-[85vh] overflow-y-auto"
      >
        <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto mb-5" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-display uppercase text-white">Entrar em Grupo</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2 block">Código do grupo</label>
            <input
              value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} maxLength={6}
              placeholder="EX: AB3K9F"
              className="w-full px-4 py-4 bg-black/40 border border-zinc-800 rounded-2xl text-white placeholder-zinc-700 focus:outline-none focus:border-[#FFD700] transition-colors font-display text-lg tracking-[0.2em] text-center"
            />
          </div>

          {!grupoEncontrado && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={buscar}
              disabled={buscando}
              className="w-full py-4 bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs disabled:opacity-60"
            >
              {buscando ? 'Buscando...' : 'Buscar grupo'}
            </motion.button>
          )}

          <AnimatePresence>
            {grupoEncontrado && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="p-4 rounded-2xl bg-black/40 border border-zinc-800 flex items-center gap-3">
                  {grupoEncontrado.publico ? <Globe size={18} className="text-zinc-500" /> : <Lock size={18} className="text-[#FFD700]" />}
                  <div>
                    <div className="font-black uppercase italic text-white">{grupoEncontrado.nome}</div>
                    <div className="text-zinc-500 text-[10px] font-bold uppercase">{grupoEncontrado.membros.length} membros</div>
                  </div>
                </div>

                {!grupoEncontrado.publico && (
                  <input
                    value={senha} onChange={(e) => setSenha(e.target.value)} type="password"
                    placeholder="Senha do grupo"
                    className="w-full px-4 py-4 bg-black/40 border border-zinc-800 rounded-2xl text-white placeholder-zinc-700 focus:outline-none focus:border-[#FFD700] transition-colors font-medium"
                  />
                )}

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={entrar}
                  disabled={entrando}
                  className="w-full py-5 bg-[#FFD700] text-black rounded-2xl font-display uppercase tracking-widest text-sm disabled:opacity-60"
                >
                  {entrando ? 'Entrando...' : 'Entrar no grupo'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
};
