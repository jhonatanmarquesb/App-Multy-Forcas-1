// ---------------------------------------------------------------------------
// Leitura de PDF de avaliação física, 100% no navegador (sem backend).
//
// Como funciona: usamos o pdfjs-dist pra extrair o TEXTO do PDF (funciona
// bem para PDFs gerados digitalmente — balanças de bioimpedância, planilhas
// exportadas, etc). Depois rodamos expressões regulares procurando os
// termos mais comuns de avaliação física em português.
//
// LIMITAÇÃO HONESTA: isso não é OCR. Um PDF que é só uma FOTO escaneada
// (sem texto selecionável) não tem texto pra extrair, e os campos ficam
// em branco — o professor preenche manualmente nesse caso. Por isso o
// formulário sempre aparece editável, nunca salva sozinho sem revisão.
// ---------------------------------------------------------------------------

import type { Avaliacao } from '../types';

export async function extractPdfText(file: File): Promise<string> {
  // Import dinâmico: só carrega a biblioteca (pesada) quando alguém
  // realmente for anexar um PDF, não no carregamento inicial do app.
  const pdfjsLib = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => ('str' in item ? item.str : '')).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

// Converte "82,4" ou "82.4" ou "82" em número. Retorna undefined se não achar nada plausível.
const toNumber = (raw?: string): number | undefined => {
  if (!raw) return undefined;
  const n = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

// Procura um padrão "rótulo [:/-]? número [unidade opcional]" em qualquer lugar do texto.
const findValue = (text: string, labels: string[]): number | undefined => {
  for (const label of labels) {
    const re = new RegExp(`${label}\\s*[:\\-]?\\s*(\\d{1,3}(?:[.,]\\d{1,2})?)`, 'i');
    const match = text.match(re);
    if (match) {
      const n = toNumber(match[1]);
      if (n !== undefined) return n;
    }
  }
  return undefined;
};

export interface AvaliacaoExtraida {
  peso?: number;
  altura?: number;
  gordura?: number;
  medidas: {
    braco?: number;
    peito?: number;
    cintura?: number;
    quadril?: number;
    coxa?: number;
  };
  /** true se conseguiu achar pelo menos um campo — sinaliza pro professor se valeu a pena tentar. */
  encontrouAlgo: boolean;
}

export function parseAvaliacaoFromText(text: string): AvaliacaoExtraida {
  const peso = findValue(text, ['peso\\s*corporal', 'peso']);
  let altura = findValue(text, ['altura', 'estatura']);
  // Alturas às vezes vêm em cm (178) — normaliza pra metros se vier um número grande.
  if (altura !== undefined && altura > 3) altura = altura / 100;
  const gordura = findValue(text, [
    '%\\s*gordura', 'gordura\\s*corporal', 'percentual\\s*de\\s*gordura', '%\\s*gc', 'gordura',
  ]);
  const braco = findValue(text, ['bra[çc]o', 'circunfer[êe]ncia\\s*do\\s*bra[çc]o']);
  const peito = findValue(text, ['peito', 't[óo]rax', 'busto']);
  const cintura = findValue(text, ['cintura']);
  const quadril = findValue(text, ['quadril']);
  const coxa = findValue(text, ['coxa']);

  const medidas = { braco, peito, cintura, quadril, coxa };
  const encontrouAlgo =
    [peso, altura, gordura, braco, peito, cintura, quadril, coxa].some((v) => v !== undefined);

  return { peso, altura, gordura, medidas, encontrouAlgo };
}

/** Monta o payload pronto pra gravar em `avaliacoes`, a partir do que foi extraído + revisado. */
export function buildAvaliacaoPayload(
  extraido: AvaliacaoExtraida,
  extras: {
    studentId: string;
    avaliadorId: string;
    avaliadorName: string;
    date: string;
    observacao?: string;
    pdfNome?: string;
    agendamentoId?: string;
  }
): Omit<Avaliacao, 'id'> {
  return {
    studentId: extras.studentId,
    avaliadorId: extras.avaliadorId,
    avaliadorName: extras.avaliadorName,
    date: extras.date,
    peso: extraido.peso,
    altura: extraido.altura,
    gordura: extraido.gordura,
    medidas: extraido.medidas,
    observacao: extras.observacao,
    pdfNome: extras.pdfNome,
    agendamentoId: extras.agendamentoId,
    createdAt: new Date().toISOString(),
  };
}
