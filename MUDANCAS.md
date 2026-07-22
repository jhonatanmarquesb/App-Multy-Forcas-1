# Multy Forças — O que mudou nesta versão

## 🔐 Segurança (leia antes de publicar)

### 1. Backdoor de admin REMOVIDA (crítico)
O `Login.tsx` tinha credenciais de bootstrap hardcoded: qualquer pessoa que abrisse
o DevTools do navegador via o CPF `00000000000` e a senha `admin123` no código,
e o próprio app criava a conta no Firebase Auth. **Esse bloco foi apagado.**

⚠️ **Ação obrigatória sua:** se a conta `00000000000@multyforcas.com.br` já existe
no Firebase Auth, **delete-a ou troque a senha** no Console (Authentication → Users).
Remover o código não remove a conta que já foi criada.

### 2. Anti-fraude no ranking (regras do Firestore)
Antes, qualquer aluno logado podia gravar `treinosConcluidos: 999999` no próprio
documento direto pela API e ir ao 1º lugar. Agora as regras só aceitam que o
próprio aluno **incremente em +1** (ou mantenha) os campos `treinosConcluidos`,
`checkinsTotal` e `streak`. Admin continua podendo tudo (para o reset de temporada).

### 3. Fim da leitura pública de perfis
`allow get: if true` permitia que **qualquer pessoa da internet, sem login**,
lesse o documento de qualquer usuário (nome, CPF, estatísticas). Agora exige login.

### 4. Check-in único por dia, garantido pelo banco
O ID do check-in precisa começar com o `uid` do próprio aluno (`uid_YYYY-MM-DD`).
Como a coleção só permite `create` (nunca `update`), é impossível sobrescrever
ou criar check-in em nome de outro aluno.

### 5. `primeiro_acesso` só anda para frente
O aluno pode mudar de `true → false` (fluxo de troca de senha), mas nunca de
volta para `true`.

### 6. Bug corrigido nas regras
O app grava `ultimoTreinoData` ao finalizar treino, mas esse campo **não estava**
na lista de campos permitidos das regras — com as regras publicadas, finalizar
treino falharia com `PERMISSION_DENIED`. Adicionado à lista.

### ⚠️ Próximo passo recomendado (não incluído nesta versão)
O CPF mora no documento `users`, e o Ranking precisa que todos os alunos listem
essa coleção — logo, **todo usuário logado ainda consegue ver CPFs de outros**.
A correção definitiva é migrar as estatísticas públicas (nome, treinos, streak)
para uma coleção separada `ranking/` e restringir `users` a admin + dono.
Isso muda a estrutura de dados, então deixei para uma próxima iteração — me
chame quando quiser fazer.

### Como publicar as novas regras
Firebase Console → Firestore Database → Rules → cole o conteúdo de
`firestore.rules` → **Publish**. Teste depois: entre como aluno, marque
exercícios e finalize um treino para confirmar que nada foi bloqueado.

---

## ✨ Interatividade e animações

- **Toasts no lugar de `alert()`** — novo sistema em `src/lib/toast.tsx`.
  Ele também **intercepta `window.alert`**, então os 30+ alerts do
  `AdminDashboard.tsx` e do `StudentSearch.tsx` viraram toasts elegantes
  automaticamente, sem eu precisar mexer nesses arquivos gigantes.
  O tom (sucesso/erro/info) é inferido pelo texto da mensagem.
- **Confete dourado** ao finalizar treino (`src/components/Confetti.tsx`),
  canvas puro, sem bibliotecas, com dois "canhões" nos cantos da tela.
- **Vibração no celular** (haptics) ao marcar exercício e ao finalizar treino.
- **Barra de progresso do treino** que enche com mola (spring) conforme os
  exercícios são marcados, com brilho dourado e aviso "Tudo marcado!" aos 100%.
- **Check animado** — o ícone dá um pulso com rotação ao concluir o exercício,
  e o risco no nome usa a cor da casa.
- **Ranking com pódio** — 1º, 2º e 3º sobem em colunas animadas (o campeão ganha
  a coroa), demais posições entram em cascata, e a **sua** linha pulsa em dourado.
- **Skeleton loaders** com shimmer no treino e no ranking, no lugar de
  spinner/texto "carregando".
- **Reset de temporada com modal de confirmação** — antes era uma sequência de
  `alert()` + `window.location.reload()`. Agora: modal → toast → recarrega só a
  lista. Também passou a zerar **apenas alunos** (antes zerava os documentos de
  professores e colaboradores junto) e divide em lotes de 450 (limite do
  Firestore é 500 operações por batch).

## 🎨 Identidade visual (menos cara de IA)

- **Nova fonte display: Anton** — condensada e pesada, cara de academia de
  verdade. Usada em títulos, números grandes, pódio e botões principais
  (classe `font-display`). O corpo continua em Inter.
- **Textura sutil de fundo** — linhas diagonais quase invisíveis + brilho
  dourado no topo, tirando o "preto chapado" genérico.
- **Tela de login** — palavra "FORÇA" gigante em marca-d'água atrás do card,
  máscara automática de CPF ao digitar (000.000.000-00), teclado numérico no
  celular, e "Fale com a Recepção" agora abre o WhatsApp da academia.
- **Microcopy com voz de treinador** — "Treino no bolso!", "Sua ficha de
  atleta", "Sequência", frase motivacional que muda por dia, "Sem treino hoje"
  no ranking.
- **Acessibilidade** — `prefers-reduced-motion` respeitado (sem confete nem
  shimmer para quem desativa animações), labels nos inputs, `aria-label` nos
  botões de ícone.

## 🔧 Ajustes de comportamento

- **Streak não conta mais em dobro** — antes, completar todos os exercícios
  (`+1` no check-in) e finalizar o treino (`+1` de novo) somava 2 na sequência
  no mesmo dia. Agora a sequência sobe apenas ao **finalizar** o treino; o
  check-in continua contando `checkinsTotal` normalmente.
- Login com Google removido da tela de login (o botão nunca era exibido e o
  código ficava morto).
- Removido `window.location.reload()` do reset do ranking.

## 📁 Arquivos novos
- `src/lib/toast.tsx` — sistema de toasts + interceptação global de alert()
- `src/components/Confetti.tsx` — confete em canvas
- `src/components/Skeleton.tsx` — loaders com shimmer

## 📁 Arquivos alterados
- `firestore.rules` ← **publicar no Console!**
- `src/index.css`, `src/App.tsx`
- `src/pages/Login.tsx`, `src/pages/WorkoutView.tsx`, `src/pages/Ranking.tsx`
- `src/contexts/AuthContext.tsx`, `src/components/Logo.tsx`

`AdminDashboard.tsx`, `StudentSearch.tsx`, `Schedule.tsx`, `ResetPassword.tsx`
e `CollaboratorDashboard.tsx` **não foram tocados** — mas herdam os toasts, a
textura de fundo e a fonte do logo automaticamente.
