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

/** Avaliação física — registrada pelo professor/admin, consumida pela tela de Evolução do aluno. */
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
  createdAt: string;
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
