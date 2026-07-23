import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Avaliacao } from '../types';
import {
  TrendingUp, TrendingDown, Ruler, CalendarClock, ChevronRight, X, User,
  FileText, MessageSquareQuote, ClipboardList,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Skeleton } from '../components/Skeleton';

// Mede a variação entre a 1ª e a última avaliação do período carregado.
const delta = (first?: number, last?: number) => {
  if (first == null || last == null) return null;
  return Math.round((last - first) * 10) / 10;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

const fmtDateFull = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

const MEDIDA_LABELS: { key: keyof NonNullable<Avaliacao['medidas']>; label: string }[] = [
  { key: 'braco', label: 'Braço' },
  { key: 'peito', label: 'Peito' },
  { key: 'cintura', label: 'Cintura' },
  { key: 'quadril', label: 'Quadril' },
  { key: 'coxa', label: 'Coxa' },
];

export const Evolucao: React.FC = () => {
  const { user } = useAuth();
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalheAberto, setDetalheAberto] = useState<Avaliacao | null>(null);

  useEffect(() => {
    if (user) fetchAvaliacoes();
  }, [user]);

  const fetchAvaliacoes = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'avaliacoes'),
        where('studentId', '==', user.uid),
        orderBy('date', 'asc')
      );
      const snap = await getDocs(q);
      setAvaliacoes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Avaliacao)));
    } catch (err) {
      console.error('Erro ao buscar avaliações:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 pt-12 max-w-2xl mx-auto space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-48" />
        </div>
        <Skeleton className="h-44 w-full" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  if (avaliacoes.length === 0) {
    return (
      <div className="p-6 pt-12 max-w-2xl mx-auto">
        <header className="mb-8">
          <div className="text-[#FFD700] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Sua Jornada</div>
          <h1 className="text-4xl font-display uppercase text-white leading-tight">Evolução</h1>
        </header>
        <div className="flex flex-col items-center justify-center py-24 text-center px-10 min-h-[50vh]">
          <div className="w-24 h-24 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center border border-zinc-800 mb-6 shadow-2xl">
            <Ruler size={40} className="text-[#FFD700] opacity-50" />
          </div>
          <h3 className="text-2xl font-display uppercase text-white mb-3">Nenhuma avaliação ainda</h3>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider max-w-[260px] leading-relaxed">
            Peça ao seu instrutor para registrar sua primeira avaliação física e seus gráficos aparecem aqui.
          </p>
        </div>
      </div>
    );
  }

  const primeira = avaliacoes[0];
  const ultima = avaliacoes[avaliacoes.length - 1];
  const historico = [...avaliacoes].reverse(); // mais recente primeiro na lista

  const pesoData = avaliacoes.filter(a => a.peso != null).map(a => ({ data: fmtDate(a.date), valor: a.peso as number }));
  const pesoDelta = delta(primeira.peso, ultima.peso);

  const medidasCards = [
    { key: 'peso', label: 'Peso', un: 'kg', v: ultima.peso, d: delta(primeira.peso, ultima.peso), lowerIsBetter: true },
    { key: 'gordura', label: 'Gordura Corp.', un: '%', v: ultima.gordura, d: delta(primeira.gordura, ultima.gordura), lowerIsBetter: true },
    { key: 'braco', label: 'Braço', un: 'cm', v: ultima.medidas?.braco, d: delta(primeira.medidas?.braco, ultima.medidas?.braco), lowerIsBetter: false },
    { key: 'peito', label: 'Peito', un: 'cm', v: ultima.medidas?.peito, d: delta(primeira.medidas?.peito, ultima.medidas?.peito), lowerIsBetter: false },
    { key: 'cintura', label: 'Cintura', un: 'cm', v: ultima.medidas?.cintura, d: delta(primeira.medidas?.cintura, ultima.medidas?.cintura), lowerIsBetter: true },
    { key: 'coxa', label: 'Coxa', un: 'cm', v: ultima.medidas?.coxa, d: delta(primeira.medidas?.coxa, ultima.medidas?.coxa), lowerIsBetter: false },
  ].filter(c => c.v != null);

  return (
    <div className="p-6 pt-12 max-w-2xl mx-auto mb-32">
      <header className="mb-8">
        <div className="text-[#FFD700] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Sua Jornada</div>
        <h1 className="text-4xl font-display uppercase text-white leading-tight">Evolução</h1>
        <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em] mt-1 border-l-2 border-[#FFD700] pl-3 italic">
          {avaliacoes.length} avaliaç{avaliacoes.length === 1 ? 'ão' : 'ões'} registrada{avaliacoes.length === 1 ? '' : 's'}
        </p>
      </header>

      {pesoData.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] p-5 mb-5"
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Peso corporal</span>
            {pesoDelta != null && (
              <span className={`flex items-center gap-1 text-xs font-black ${pesoDelta <= 0 ? 'text-[#FFD700]' : 'text-zinc-400'}`}>
                {pesoDelta <= 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
                {pesoDelta > 0 ? '+' : ''}{pesoDelta} kg no período
              </span>
            )}
          </div>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pesoData} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                <XAxis dataKey="data" stroke="#3f3f46" tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#3f3f46" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, fontSize: 11 }}
                  labelStyle={{ color: '#71717a' }} itemStyle={{ color: '#FFD700', fontWeight: 900 }}
                  formatter={(v: number) => [`${v} kg`, 'Peso']}
                />
                <Line type="monotone" dataKey="valor" stroke="#FFD700" strokeWidth={3} dot={{ fill: '#FFD700', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-8">
        {medidasCards.map((m, i) => (
          <motion.div
            key={m.key}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] p-4"
          >
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">{m.label}</div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-display text-white">{m.v}</span>
              <span className="text-zinc-600 font-bold text-[10px]">{m.un}</span>
            </div>
            {m.d != null && m.d !== 0 && (
              <div
                className="text-[10px] font-black mt-1"
                style={{ color: (m.lowerIsBetter ? m.d < 0 : m.d > 0) ? '#FFD700' : '#71717a' }}
              >
                {m.d > 0 ? '+' : ''}{m.d} {m.un} no período
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Histórico completo — cada avaliação abre com todos os detalhes e o comentário do professor */}
      <div>
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 px-1 flex items-center gap-2">
          <ClipboardList size={12} className="text-[#FFD700]" />
          Histórico de avaliações
        </div>
        <div className="space-y-3">
          {historico.map((av, i) => (
            <motion.button
              key={av.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setDetalheAberto(av)}
              className="w-full p-4 rounded-2xl bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 hover:border-[#FFD700]/30 transition-colors flex items-center gap-3 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-black/40 border border-zinc-800 flex items-center justify-center shrink-0 text-[#FFD700]">
                <CalendarClock size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-black italic uppercase text-sm truncate">{fmtDate(av.date)} · {av.avaliadorName}</div>
                <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase mt-0.5">
                  {av.peso != null && <span>{av.peso} kg</span>}
                  {av.observacao && (
                    <span className="flex items-center gap-1 text-[#FFD700]/80">
                      <MessageSquareQuote size={10} /> tem comentário
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-600 shrink-0" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Bottom sheet com o conteúdo completo da avaliação selecionada */}
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
                <div className="text-[#FFD700] text-[10px] font-black uppercase tracking-[0.2em]">Avaliação de {fmtDateFull(detalheAberto.date)}</div>
                <button onClick={() => setDetalheAberto(null)} className="text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              <h3 className="text-2xl font-display uppercase text-white mb-1 leading-tight">Detalhes</h3>
              <p className="flex items-center gap-1.5 text-zinc-500 text-xs font-bold uppercase tracking-wider mb-6">
                <User size={12} /> Avaliado por {detalheAberto.avaliadorName}
              </p>

              {/* Números registrados naquele dia */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Peso', v: detalheAberto.peso, un: 'kg' },
                  { label: 'Altura', v: detalheAberto.altura, un: 'm' },
                  { label: 'Gordura', v: detalheAberto.gordura, un: '%' },
                ].filter(x => x.v != null).map(x => (
                  <div key={x.label} className="border border-zinc-800 bg-black/40 rounded-2xl p-3 text-center">
                    <div className="font-display text-white text-lg">{x.v}</div>
                    <div className="text-zinc-600 font-bold uppercase text-[7px] tracking-widest mt-1">{x.label} ({x.un})</div>
                  </div>
                ))}
              </div>

              {MEDIDA_LABELS.some(({ key }) => detalheAberto.medidas?.[key] != null) && (
                <div className="mb-5">
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Medidas (cm)</div>
                  <div className="grid grid-cols-3 gap-3">
                    {MEDIDA_LABELS.filter(({ key }) => detalheAberto.medidas?.[key] != null).map(({ key, label }) => (
                      <div key={key} className="border border-zinc-800 bg-black/40 rounded-2xl p-3 text-center">
                        <div className="font-display text-white text-base">{detalheAberto.medidas?.[key]}</div>
                        <div className="text-zinc-600 font-bold uppercase text-[7px] tracking-widest mt-1">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detalheAberto.observacao ? (
                <div className="border border-[#FFD700]/20 bg-[#FFD700]/5 rounded-2xl p-4 mb-4">
                  <div className="flex items-center gap-1.5 text-[#FFD700] text-[9px] font-black uppercase tracking-[0.2em] mb-1.5">
                    <MessageSquareQuote size={12} /> Comentário do professor
                  </div>
                  <p className="text-zinc-200 italic text-sm leading-relaxed">"{detalheAberto.observacao}"</p>
                </div>
              ) : (
                <div className="border border-dashed border-zinc-800 rounded-2xl p-4 mb-4 text-center">
                  <p className="text-zinc-600 text-[11px] font-bold uppercase">Sem comentário registrado nessa avaliação</p>
                </div>
              )}

              {detalheAberto.pdfNome && (
                <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase px-1">
                  <FileText size={12} className="text-zinc-600" />
                  Gerada a partir do PDF: {detalheAberto.pdfNome}
                </div>
              )}

              <button
                onClick={() => setDetalheAberto(null)}
                className="w-full mt-6 py-4 bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-700 transition-colors"
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
