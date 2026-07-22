import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Agendamento } from '../types';
import {
  Calendar, Clock, User, Apple, ClipboardList, CheckCircle2, Upload, FileText,
  X, Sparkles, AlertCircle, Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from '../lib/toast';
import { extractPdfText, parseAvaliacaoFromText, buildAvaliacaoPayload, AvaliacaoExtraida } from '../lib/pdfEvaluation';

const fmtDataHora = (iso: string) => {
  const d = new Date(iso);
  return {
    data: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
};

export const AvaliacoesConsultas: React.FC = () => {
  const { user, profile } = useAuth();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrando, setRegistrando] = useState<Agendamento | null>(null);

  useEffect(() => {
    if (user) fetchMeusAgendamentos();
  }, [user]);

  const fetchMeusAgendamentos = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'agendamentos'),
        where('professorId', '==', user.uid),
        orderBy('date', 'asc')
      );
      const snap = await getDocs(q);
      setAgendamentos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Agendamento)));
    } catch (err) {
      console.error(err);
      toast('Não deu pra carregar seus agendamentos agora.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const agora = Date.now();
  const pendentes = agendamentos.filter(a => !a.avaliacaoId);
  const concluidos = agendamentos.filter(a => !!a.avaliacaoId);

  const AgendamentoCard: React.FC<{ ag: Agendamento; index: number }> = ({ ag, index }) => {
    const { data: dataFmt, hora } = fmtDataHora(ag.date);
    const isAvaliacao = ag.services?.some(s => s.toLowerCase().includes('avalia'));
    const passou = new Date(ag.date).getTime() < agora;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        className={cn(
          'p-5 rounded-[1.75rem] border flex items-center gap-4',
          ag.avaliacaoId
            ? 'bg-zinc-900/25 border-zinc-800/40'
            : 'bg-zinc-900/50 border-zinc-800/60'
        )}
      >
        <div className={cn(
          'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border',
          ag.avaliacaoId ? 'bg-black/30 border-zinc-800 text-zinc-600' : 'bg-[#FFD700]/10 border-[#FFD700]/30 text-[#FFD700]'
        )}>
          {isAvaliacao ? <ClipboardList size={18} /> : <Apple size={18} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-black uppercase italic text-white truncate">{ag.studentName}</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-500 text-[10px] font-bold uppercase tracking-wider mt-1">
            <span className="flex items-center gap-1"><Calendar size={11} />{dataFmt}</span>
            <span className="flex items-center gap-1"><Clock size={11} />{hora}</span>
            <span className="truncate">{ag.services?.join(' + ')}</span>
          </div>
        </div>

        {ag.avaliacaoId ? (
          <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-[#FFD700] shrink-0 px-2.5 py-1.5 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/20">
            <CheckCircle2 size={12} /> Registrada
          </span>
        ) : (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setRegistrando(ag)}
            className="shrink-0 flex items-center gap-1.5 text-[9px] font-black uppercase px-3 py-2.5 rounded-xl bg-[#FFD700] text-black"
          >
            <Upload size={12} /> Registrar
          </motion.button>
        )}
      </motion.div>
    );
  };

  return (
    <div className="p-6 pt-12 max-w-2xl mx-auto mb-32">
      <header className="mb-8">
        <div className="text-[#FFD700] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Sua Agenda</div>
        <h1 className="text-4xl font-display uppercase text-white leading-tight">Avaliações e Consultas</h1>
        <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em] mt-1 border-l-2 border-[#FFD700] pl-3 italic">
          Atribuídas a {profile?.name?.split(' ')[0] || 'você'}
        </p>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => <div key={i} className="skeleton h-20 rounded-[1.75rem]" />)}
        </div>
      ) : agendamentos.length === 0 ? (
        <div className="bg-zinc-900/20 border border-dashed border-zinc-800 rounded-[2rem] py-16 text-center px-6">
          <Calendar size={32} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-400 text-sm font-black italic uppercase">Nenhum agendamento atribuído</p>
          <p className="text-zinc-600 text-[11px] mt-1.5">Quando a recepção marcar uma avaliação ou consulta com você, aparece aqui.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {pendentes.length > 0 && (
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 px-1">
                Pendentes ({pendentes.length})
              </div>
              <div className="space-y-3">
                {pendentes.map((ag, i) => <AgendamentoCard key={ag.id} ag={ag} index={i} />)}
              </div>
            </div>
          )}

          {concluidos.length > 0 && (
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 px-1">
                Concluídas ({concluidos.length})
              </div>
              <div className="space-y-3">
                {concluidos.map((ag, i) => <AgendamentoCard key={ag.id} ag={ag} index={i} />)}
              </div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {registrando && (
          <RegistrarAvaliacaoModal
            agendamento={registrando}
            onClose={() => setRegistrando(null)}
            onSaved={() => { setRegistrando(null); fetchMeusAgendamentos(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Modal: upload de PDF + leitura automática + revisão manual ---------------
const CAMPO: { key: keyof AvaliacaoExtraida['medidas']; label: string }[] = [
  { key: 'braco', label: 'Braço (cm)' },
  { key: 'peito', label: 'Peito (cm)' },
  { key: 'cintura', label: 'Cintura (cm)' },
  { key: 'quadril', label: 'Quadril (cm)' },
  { key: 'coxa', label: 'Coxa (cm)' },
];

const RegistrarAvaliacaoModal: React.FC<{
  agendamento: Agendamento;
  onClose: () => void;
  onSaved: () => void;
}> = ({ agendamento, onClose, onSaved }) => {
  const { user, profile } = useAuth();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [lendo, setLendo] = useState(false);
  const [leituraFeita, setLeituraFeita] = useState(false);
  const [leituraEncontrouAlgo, setLeituraEncontrouAlgo] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [gordura, setGordura] = useState('');
  const [medidas, setMedidas] = useState<Record<string, string>>({});
  const [observacao, setObservacao] = useState('');

  const handleFile = (file: File | null) => {
    setArquivo(file);
    setLeituraFeita(false);
    setLeituraEncontrouAlgo(null);
  };

  const lerPdf = async () => {
    if (!arquivo) return;
    setLendo(true);
    try {
      const texto = await extractPdfText(arquivo);
      const extraido = parseAvaliacaoFromText(texto);

      if (extraido.peso !== undefined) setPeso(String(extraido.peso));
      if (extraido.altura !== undefined) setAltura(String(extraido.altura));
      if (extraido.gordura !== undefined) setGordura(String(extraido.gordura));
      setMedidas(prev => {
        const next = { ...prev };
        CAMPO.forEach(({ key }) => {
          const v = extraido.medidas[key];
          if (v !== undefined) next[key] = String(v);
        });
        return next;
      });

      setLeituraEncontrouAlgo(extraido.encontrouAlgo);
      setLeituraFeita(true);

      if (extraido.encontrouAlgo) {
        toast('PDF lido! Confira os valores antes de salvar.', 'success');
      } else {
        toast('Não consegui reconhecer nenhum valor nesse PDF. Preencha manualmente abaixo.', 'info');
      }
    } catch (err) {
      console.error(err);
      toast('Não consegui ler esse PDF (pode ser uma imagem escaneada). Preencha manualmente.', 'error');
      setLeituraFeita(true);
      setLeituraEncontrouAlgo(false);
    } finally {
      setLendo(false);
    }
  };

  const salvar = async () => {
    if (!user || !profile) return;
    const studentId = agendamento.studentId;
    if (!studentId) {
      toast('Esse agendamento não tem um aluno vinculado corretamente.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = buildAvaliacaoPayload(
        {
          peso: peso ? parseFloat(peso.replace(',', '.')) : undefined,
          altura: altura ? parseFloat(altura.replace(',', '.')) : undefined,
          gordura: gordura ? parseFloat(gordura.replace(',', '.')) : undefined,
          medidas: Object.fromEntries(
            CAMPO.map(({ key }) => [key, medidas[key] ? parseFloat(medidas[key].replace(',', '.')) : undefined])
          ),
          encontrouAlgo: true,
        },
        {
          studentId,
          avaliadorId: user.uid,
          avaliadorName: profile.name,
          date: new Date().toISOString(),
          observacao: observacao || undefined,
          pdfNome: arquivo?.name,
          agendamentoId: agendamento.id,
        }
      );

      // Remove undefined explicitamente (Firestore não aceita undefined em campos)
      const clean = JSON.parse(JSON.stringify(payload));

      const ref = await addDoc(collection(db, 'avaliacoes'), clean);

      if (agendamento.id) {
        await updateDoc(doc(db, 'agendamentos', agendamento.id), {
          avaliacaoId: ref.id,
          updatedAt: new Date().toISOString(),
        });
      }

      toast(`Avaliação de ${agendamento.studentName} registrada! Já aparece na Evolução dele(a).`, 'success');
      onSaved();
    } catch (err) {
      console.error(err);
      toast('Não deu pra salvar a avaliação agora. Tente de novo.', 'error');
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
        className="fixed inset-x-0 bottom-0 z-[91] max-w-2xl mx-auto bg-zinc-900 border-t border-[#FFD700]/20 rounded-t-[2rem] p-6 pb-10 safe-bottom max-h-[88vh] overflow-y-auto"
      >
        <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto mb-5" />
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xl font-display uppercase text-white">Registrar Avaliação</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-6">{agendamento.studentName}</p>

        {/* Upload + leitura automática */}
        <div className="mb-6">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2 block">
            PDF da avaliação (opcional)
          </label>
          <label
            htmlFor="pdf-upload"
            className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-zinc-700 hover:border-[#FFD700]/40 cursor-pointer transition-colors bg-black/30"
          >
            <FileText size={20} className="text-zinc-500 shrink-0" />
            <span className="text-zinc-400 text-xs font-medium truncate flex-1">
              {arquivo ? arquivo.name : 'Toque para escolher um arquivo PDF'}
            </span>
          </label>
          <input
            id="pdf-upload" type="file" accept="application/pdf" className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
          />

          {arquivo && !leituraFeita && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={lerPdf}
              disabled={lendo}
              className="w-full mt-3 py-3.5 rounded-2xl bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {lendo ? <><Loader2 size={14} className="animate-spin" /> Lendo o PDF...</> : <><Sparkles size={14} /> Ler PDF automaticamente</>}
            </motion.button>
          )}

          {leituraFeita && (
            <div className={cn(
              'mt-3 p-3 rounded-xl text-[10px] font-bold uppercase flex items-center gap-2',
              leituraEncontrouAlgo ? 'bg-[#FFD700]/10 text-[#FFD700]' : 'bg-zinc-800/60 text-zinc-400'
            )}>
              {leituraEncontrouAlgo ? <Sparkles size={13} /> : <AlertCircle size={13} />}
              {leituraEncontrouAlgo
                ? 'Valores preenchidos automaticamente — revise antes de salvar.'
                : 'Não reconheci valores nesse PDF. Preencha manualmente abaixo.'}
            </div>
          )}
        </div>

        {/* Formulário — sempre editável, mesmo depois da leitura automática */}
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-1.5 block">Peso (kg)</label>
              <input value={peso} onChange={e => setPeso(e.target.value)} inputMode="decimal" placeholder="82,4"
                className="w-full px-3 py-3 bg-black/40 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-[#FFD700] transition-colors" />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-1.5 block">Altura (m)</label>
              <input value={altura} onChange={e => setAltura(e.target.value)} inputMode="decimal" placeholder="1,78"
                className="w-full px-3 py-3 bg-black/40 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-[#FFD700] transition-colors" />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-1.5 block">Gordura (%)</label>
              <input value={gordura} onChange={e => setGordura(e.target.value)} inputMode="decimal" placeholder="18,5"
                className="w-full px-3 py-3 bg-black/40 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-[#FFD700] transition-colors" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2 block">Medidas</label>
            <div className="grid grid-cols-2 gap-3">
              {CAMPO.map(({ key, label }) => (
                <div key={key}>
                  <label className="text-[9px] font-bold text-zinc-600 mb-1.5 block">{label}</label>
                  <input
                    value={medidas[key] || ''}
                    onChange={e => setMedidas({ ...medidas, [key]: e.target.value })}
                    inputMode="decimal" placeholder="—"
                    className="w-full px-3 py-3 bg-black/40 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-[#FFD700] transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2 block">Observação (opcional)</label>
            <textarea
              value={observacao} onChange={e => setObservacao(e.target.value)} rows={3}
              placeholder="Ex: Boa evolução no supino, foco em cintura no próximo mês..."
              className="w-full px-4 py-3 bg-black/40 border border-zinc-800 rounded-2xl text-white text-sm resize-none focus:outline-none focus:border-[#FFD700] transition-colors placeholder-zinc-700"
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={salvar}
            disabled={saving}
            className="w-full py-5 bg-[#FFD700] text-black rounded-2xl font-display uppercase tracking-widest text-sm disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /> Salvar avaliação</>}
          </motion.button>
        </div>
      </motion.div>
    </>
  );
};
