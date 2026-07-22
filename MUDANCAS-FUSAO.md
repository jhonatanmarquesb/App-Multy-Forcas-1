# Multy Forças — Fusão v3 (protótipo + produção)

Este é o app **real**, conectado ao Firebase, com as interações do protótipo
implantadas de verdade. Nada aqui é mock: tudo lê e grava no Firestore.

## O que foi fundido

### 1. Tracking por série (chips), não mais um único "concluído"
Antes: cada exercício tinha um único toggle `completed`. Agora cada exercício
mostra um chip por série (`S1 S2 S3 S4`) — exatamente como no protótipo. Tocar
um chip marca aquela série (`completedSets` em `types.ts`), vibra o celular,
e dispara o timer de descanso automaticamente com a duração cadastrada pelo
professor (`ex.rest`). A barra de progresso do treino agora mede **séries
feitas / séries totais**, não exercícios — reflete melhor o esforço real.

### 2. Carga real do dia, separada da carga prescrita
Novo campo `actualLoad` no exercício. O professor prescreve `load` na ficha
("60kg"); o aluno ajusta com o stepper `−  62.5  +` (passos de 2,5kg) o que
**realmente** usou naquele dia, sem alterar a prescrição. Isso é o que
alimenta o "volume total movido" da tela de recompensa.

### 3. Bottom sheet real (sem trocar de tela)
Tocar no nome do exercício abre uma folha deslizante de baixo com séries×reps,
carga prescrita, descanso e a observação do professor — a UX do protótipo,
ligada aos dados reais da ficha.

### 4. Timer de descanso flutuante
Some sozinho quando some, conta regressivo, vibra em padrão duplo ao zerar.
Só dispara ao **marcar** uma série (não ao desmarcar), e não dispara na
última série do exercício (já é hora de trocar, não de descansar).

### 5. Recompensa com volume total (toneladas movidas)
A tela de "Treino no Bolso" ganhou uma 3ª estatística: `Σ carga_real ×
reps × séries` de todas as divisões da ficha, em toneladas — como no
protótipo, mas calculado em cima dos dados reais que o aluno acabou de
registrar, não um número fixo de demonstração.

### 6. Nova página: Evolução (não existia no app de produção)
`src/pages/Evolucao.tsx` — gráfico de peso corporal (Recharts, o mesmo do
protótipo) e cards de medidas (braço, peito, cintura, coxa, % de gordura)
com o delta desde a primeira avaliação registrada. Fica na 3ª aba do bottom
nav, visível **só para alunos**. Estado vazio convida a pedir a avaliação ao
instrutor, em vez de mostrar gráfico zerado.

Isso precisou de uma coleção nova, `avaliacoes/`, com regras próprias:
o aluno só lê a própria avaliação; só professor/admin criam ou editam.

### 7. Ranking com pódio (já fundido na rodada anterior, mantido)
1º/2º/3º em colunas animadas com coroa no campeão, sua posição com glow
pulsante — isso já tinha sido implantado; conferido que segue coerente com
o resto da fusão.

## O que ficou de fora desta rodada (e por quê)

- **Coleção `sessoes` por sessão de treino** (do documento de arquitetura) —
  daria histórico de carga por sessão em vez de só a última carga registrada.
  Não implementada agora porque muda o modelo de gravação do zero; o que
  entrou (`actualLoad` no próprio exercício) já resolve "carga real de hoje"
  sem essa migração. Se quiser o histórico completo depois, é o próximo passo.
- **Ranking por `ciclos/{mês}`** — o reset de temporada continua zerando os
  contadores em `users` (como já estava). A migração para ciclos não-destrutivos
  segue documentada no `multy-forcas-spec.md` anterior, disponível quando quiser.
- **Galeria de fotos de evolução** — a tela de Evolução por enquanto é só
  números (peso/medidas); upload de fotos fica para uma próxima rodada.

## Ação obrigatória para publicar

1. `npm install` — adicionei `recharts` ao `package.json` (usado pela Evolução).
2. Publicar o `firestore.rules` atualizado no Console (nova seção `avaliacoes`).
3. Cadastrar ao menos uma avaliação física de teste na coleção `avaliacoes`
   para ver a tela de Evolução com dados (formato em `types.ts` → `Avaliacao`).
   O AdminDashboard ainda não tem uma tela para o professor cadastrar isso —
   por ora, é criar o documento direto no Console; posso construir essa tela
   quando você quiser.

## Arquivos alterados/criados nesta fusão
- `src/pages/WorkoutView.tsx` — reescrito (chips, stepper, sheet, timer, volume)
- `src/pages/Evolucao.tsx` — novo
- `src/components/BottomNav.tsx` — aba Evolução para alunos
- `src/App.tsx` — rota `evolucao`
- `src/types.ts` — `Exercise.completedSets/actualLoad`, novo tipo `Avaliacao`
- `firestore.rules` — coleção `avaliacoes`
- `package.json` — `recharts`
