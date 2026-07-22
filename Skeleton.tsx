import React from 'react';
import { cn } from '../lib/utils';

// Blocos de carregamento com shimmer — muito mais "app de verdade" que um spinner.

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('skeleton rounded-2xl', className)} aria-hidden="true" />
);

/** Lista de cards do treino carregando */
export const WorkoutSkeleton: React.FC = () => (
  <div className="p-6 pt-12 max-w-2xl mx-auto space-y-6" role="status" aria-label="Carregando treino">
    <div className="space-y-3">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-3 w-40" />
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-12 w-24 rounded-[1.5rem]" />
      <Skeleton className="h-12 w-24 rounded-[1.5rem]" />
      <Skeleton className="h-12 w-24 rounded-[1.5rem]" />
    </div>
    <Skeleton className="h-2 w-full rounded-full" />
    {[0, 1, 2, 3].map(i => (
      <div key={i} className="p-6 rounded-[2rem] border border-zinc-800/50 bg-zinc-900/30 flex items-center gap-5">
        <Skeleton className="w-10 h-10 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <div className="flex gap-3">
            <Skeleton className="h-6 w-16 rounded-lg" />
            <Skeleton className="h-6 w-16 rounded-lg" />
            <Skeleton className="h-6 w-20 rounded-lg" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

/** Ranking carregando: pódio + linhas */
export const RankingSkeleton: React.FC = () => (
  <div className="space-y-6" role="status" aria-label="Carregando ranking">
    <div className="flex items-end justify-center gap-3 pt-6">
      <Skeleton className="w-24 h-28 rounded-t-[1.5rem]" />
      <Skeleton className="w-28 h-40 rounded-t-[1.5rem]" />
      <Skeleton className="w-24 h-20 rounded-t-[1.5rem]" />
    </div>
    {[0, 1, 2, 3].map(i => (
      <div key={i} className="p-5 rounded-[2rem] border border-zinc-800/50 bg-zinc-900/30 flex items-center gap-5">
        <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    ))}
  </div>
);
