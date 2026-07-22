export type UserRole = 'admin' | 'colaborador' | 'aluno' | 'professor';

export interface UserProfile {
  id?: string;
  uid: string;
  name: string;
  cpf: string;
  role: UserRole;
  primeiro_acesso: boolean;
  checkinsTotal?: number;
  treinosConcluidos?: number;
  lastWorkoutFinish?: string;
  streak?: number;
  lastCheckin?: string;
  ultimoTreinoData?: string;
  status?: 'ativo' | 'inativo';
  ativo?: boolean;
  fcmToken?: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  load?: string;
  rest?: string;
  order: number;
  observation?: string;
  completed?: boolean;
  /** Nº de séries marcadas como feitas nesta sessão (tracking por chip, não só um toggle). */
  completedSets?: number;
  /** Carga que o aluno realmente usou hoje, ajustável na hora (independe da carga prescrita em `load`). */
  actualLoad?: number;
}

/**
 * Grupo de ranking customizado, criado por um aluno (ou pelo admin) para
 * competir só com os amigos. Público = qualquer um encontra e entra;
 * Privado = só entra com o código + a senha que o criador definiu.
 *
 * NOTA DE SEGURANÇA: a "senha" aqui é um código de sala simples (tipo PIN de
 * jogo entre amigos), não uma credencial sensível — ela fica legível por
 * qualquer usuário logado que leia o documento do grupo. Não reaproveite
 * senhas reais aqui. Ver MUDANCAS-V4.md para detalhes.
 */
export interface Grupo {
  id?: string;
  nome: string;
  criadorId: string;
  criadorNome: string;
  publico: boolean;
  senha?: string;
  codigo: string; // 6 caracteres, usado para localizar o grupo ao entrar
  membros: string[]; // uids
  createdAt: string;
}
export interface Avaliacao {
  id?: string;
  studentId: string;
  avaliadorId: string;
  avaliadorName: string;
  date: string; // ISO
  peso?: number;
  altura?: number;
  gordura?: number;
  medidas?: {
    braco?: number;
    peito?: number;
    cintura?: number;
    quadril?: number;
    coxa?: number;
  };
  observacao?: string;
  /** Nome do arquivo PDF original, se a avaliação veio de um upload. */
  pdfNome?: string;
  /** Vincula essa avaliação ao agendamento que a originou, se houver. */
  agendamentoId?: string;
  createdAt: string;
}

/**
 * Agendamento de avaliação física ou consulta. Sempre atribuído a um
 * professor responsável — quem cria o agendamento (admin/colaborador)
 * escolhe o professor de uma lista; o professor só enxerga os que foram
 * atribuídos a ele.
 */
export interface Agendamento {
  id?: string;
  studentId: string;
  studentName: string;
  services: string[];
  date: string; // ISO (data + hora combinadas)
  observation?: string;
  paymentStatus: 'Pago' | 'Pendente';
  professorId: string;
  professorName: string;
  /** Preenchido quando o professor já registrou a avaliação correspondente. */
  avaliacaoId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export type WorkoutDivision = 'A' | 'B' | 'C' | 'D' | 'E';

export interface Workout {
  id?: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  divisions: {
    [key in WorkoutDivision]?: Exercise[];
  };
  divisionNames?: {
    [key in WorkoutDivision]?: string;
  };
  createdAt: string;
  updatedAt: string;
  title: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}
