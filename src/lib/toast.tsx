import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

// ---------------------------------------------------------------------------
// API global: pode ser chamada de qualquer lugar, inclusive fora de componentes.
// O ToastProvider também substitui window.alert, então TODO o código legado
// (AdminDashboard, StudentSearch...) passa a exibir toasts automaticamente.
// ---------------------------------------------------------------------------

let pushExternal: ((message: string, tone?: ToastTone) => void) | null = null;

export function toast(message: string, tone?: ToastTone) {
  if (pushExternal) {
    pushExternal(message, tone);
  } else {
    // Provider ainda não montou (ex.: erro logo no boot) — tenta de novo em seguida.
    window.setTimeout(() => pushExternal?.(message, tone), 80);
  }
}

function inferTone(message: string): ToastTone {
  const m = message.toLowerCase();
  if (
    m.includes('erro') || m.includes('❌') || m.includes('inválid') ||
    m.includes('bloquead') && !m.includes('reativad') ||
    m.includes('insuficiente') || m.includes('não encontrado') ||
    m.includes('vazio') || m.includes('coincidem')
  ) return 'error';
  if (
    m.includes('sucesso') || m.includes('✅') || m.includes('parabéns') ||
    m.includes('concluíd') || m.includes('salvo') || m.includes('atualizad') ||
    m.includes('importad') || m.includes('agendad') || m.includes('cadastrad') ||
    m.includes('reativad') || m.includes('registrad') || m.includes('enviado')
  ) return 'success';
  return 'info';
}

function cleanMessage(message: string): string {
  // Remove emojis de status do início — o ícone do toast já comunica o tom.
  return String(message).replace(/^[\s✅❌⏳🔥⚠️💪🎉]+/u, '').trim();
}

const TONE_STYLE: Record<ToastTone, { bar: string; icon: React.ReactNode }> = {
  success: {
    bar: 'bg-[#FFD700]',
    icon: <CheckCircle2 size={18} className="text-[#FFD700]" strokeWidth={2.5} />,
  },
  error: {
    bar: 'bg-red-500',
    icon: <AlertTriangle size={18} className="text-red-500" strokeWidth={2.5} />,
  },
  info: {
    bar: 'bg-zinc-500',
    icon: <Info size={18} className="text-zinc-400" strokeWidth={2.5} />,
  },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((message: string, tone?: ToastTone) => {
    const clean = cleanMessage(message);
    if (!clean) return;
    const id = ++counter.current;
    const item: ToastItem = { id, message: clean, tone: tone || inferTone(message) };
    setToasts(prev => [...prev.slice(-2), item]); // no máximo 3 na tela
    window.setTimeout(() => remove(id), 4500);
  }, [remove]);

  useEffect(() => {
    pushExternal = push;
    // Intercepta alert() nativo: qualquer código legado ganha toasts de graça.
    const nativeAlert = window.alert;
    window.alert = (message?: unknown) => push(String(message ?? ''));
    return () => {
      pushExternal = null;
      window.alert = nativeAlert;
    };
  }, [push]);

  return (
    <>
      {children}
      <div className="fixed top-20 inset-x-0 z-[200] flex flex-col items-center gap-2 px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => {
            const style = TONE_STYLE[t.tone];
            return (
              <motion.button
                key={t.id}
                layout
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                onClick={() => remove(t.id)}
                className="pointer-events-auto w-full max-w-sm bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden text-left"
              >
                <div className="flex items-start gap-3 p-4">
                  <div className="shrink-0 mt-0.5">{style.icon}</div>
                  <p className="text-[12px] font-bold text-zinc-200 leading-snug whitespace-pre-line flex-1">
                    {t.message}
                  </p>
                </div>
                <motion.div
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: 4.5, ease: 'linear' }}
                  style={{ originX: 0 }}
                  className={`h-0.5 ${style.bar}`}
                />
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
};
